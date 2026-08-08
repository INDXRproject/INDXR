import assemblyai as aai
import os
import logging

logger = logging.getLogger("indxr-backend")

aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
# EU-endpoint (eu-west-1) voor data-residency — alle async transcriptie draait in de EU.
aai.settings.base_url = "https://api.eu.assemblyai.com"

# speech_models is een LANGUAGE ROUTER, geen error-fallback-lijst: Universal-3.5 Pro dekt 18 talen
# natief; elke andere taal wordt door Universal-2 (99 talen) bediend. Chain =
# ["universal-3-5-pro", "universal-2"] per AssemblyAI's eigen aanbeveling. universal-3-pro is bewust
# weggelaten: zijn 6 natieve talen zijn een subset van 3.5 Pro's 18, dus met 3.5 Pro eerst zou het
# nooit gekozen worden (ADR-071). language_detection MOET aan zodat de router per gedetecteerde taal
# kan kiezen. Geldige AssemblyAI-ids gebruiken streepjes: "universal-3-5-pro" (NIET "universal-3.5-pro").
_TRANSCRIPTION_CONFIG = aai.TranscriptionConfig(
    speech_models=["universal-3-5-pro", "universal-2"],
    language_detection=True,
    punctuate=True,
    format_text=True,
    # Sprekerherkenning (diarisatie). Async add-on van +$0,02/u bovenop het modeltarief
    # (NIET in het basistarief — AssemblyAI-prijspagina). We geven GEEN speakers_expected mee:
    # het model bepaalt zelf het aantal sprekers. Elk woord krijgt hierdoor een .speaker-label
    # ('A'/'B'/…); _build_segments stempelt dat per segment. Kost per job in transcription_jobs.
    # diarization=true (COR-add-on via _geld_scope). Captions lopen hier niet langs → geen add-on.
    speaker_labels=True,
)


def _build_segments(transcript) -> list:
    """AssemblyAI-woorden → ~5-seconden-segmenten in ons transcript-formaat.

    Met diarisatie (speaker_labels) draagt elk woord een spreker-label ('A'/'B'/…). We breken een
    segment óók af zodra de spreker wisselt en stempelen het label op het segment, zodat elk segment
    precies één spreker bevat (utterances zelf kunnen minutenlang zijn en zouden reading-paragraphs
    en RAG-chunking breken). Zonder diarisatie is word.speaker None → dan geen 'speaker'-key, en het
    segment blijft exact {text, offset, duration} (bestaande transcripten/captions ongemoeid)."""
    segments: list = []
    words = transcript.words or []
    if not words:
        return segments

    current: list = []
    seg_start = None
    seg_speaker = None
    seg_end = None

    def _flush() -> None:
        if current and seg_start is not None:
            seg = {'text': ' '.join(current), 'offset': seg_start, 'duration': seg_end - seg_start}
            if seg_speaker is not None:
                seg['speaker'] = seg_speaker
            segments.append(seg)

    for word in words:
        w_speaker = getattr(word, 'speaker', None)
        w_start = word.start / 1000.0
        w_end = word.end / 1000.0
        if seg_start is None:
            seg_start = w_start
            seg_speaker = w_speaker
        elif w_speaker != seg_speaker:
            # Spreker wisselt → sluit het lopende segment af vóór dit woord.
            _flush()
            current = []
            seg_start = w_start
            seg_speaker = w_speaker
        current.append(word.text)
        seg_end = w_end
        if (seg_end - seg_start) >= 5.0:
            _flush()
            current = []
            seg_start = None
            seg_speaker = None
    _flush()
    return segments


def submit_assemblyai(audio_path: str) -> dict:
    """
    Dien een audiobestand NON-BLOCKING in bij AssemblyAI (upload + create job). Retourneert direct
    de provider-transcript-id; de pipeline pollt daarna zelf (submit+poll, commit 3) zodat de
    heartbeat per poll tikt en een lange job de watchdog niet triggert. Blokkeert NIET tot done.
    Returns: { 'success': True, 'transcript_id': str } | { 'success': False, 'error': str }
    """
    try:
        transcriber = aai.Transcriber(config=_TRANSCRIPTION_CONFIG)
        transcript = transcriber.submit(audio_path)
        # submit() zet de job op de wachtrij en retourneert direct een id + status=queued.
        if transcript.status == aai.TranscriptStatus.error:
            return {'success': False, 'error': transcript.error or 'submit returned error status'}
        if not transcript.id:
            return {'success': False, 'error': 'AssemblyAI submit returned no transcript id'}
        return {'success': True, 'transcript_id': transcript.id}
    except Exception as e:
        logger.error(f"AssemblyAI submit error: {e}")
        return {'success': False, 'error': str(e)}


def poll_assemblyai(transcript_id: str) -> dict:
    """
    Eén poll van een lopende AssemblyAI-job op provider-transcript-id. Muteert niets; de pipeline
    beslist op basis van 'status' wat te doen (heartbeat tikken, fase-timestamps schrijven, done/error).
    Returns:
      { 'success': True, 'status': 'queued'|'processing'|'completed'|'error',
        # alleen bij 'completed':
        'transcript': [...segments...], 'duration': float, 'model': str|None, 'language': str|None,
        # alleen bij 'error':
        'error': str }
      { 'success': False, 'error': str }   ← poll-call zelf faalde (netwerk/SDK); NIET provider-error
    """
    try:
        transcript = aai.Transcript.get_by_id(transcript_id)
        status = str(transcript.status)

        if transcript.status == aai.TranscriptStatus.error:
            return {'success': True, 'status': 'error', 'error': transcript.error or 'transcription failed'}

        if transcript.status == aai.TranscriptStatus.completed:
            segments = _build_segments(transcript)
            duration = getattr(transcript, 'audio_duration', None) or 0
            if not duration and segments:
                last = segments[-1]
                duration = last['offset'] + last['duration']
            # Effectief gedraaid model (language-router kiest er één) — voedt de per-model COR-rate
            # (ADR-070): universal-2 = $0.15/hr, universal-3-5-pro = $0.21/hr.
            model_used = getattr(transcript, 'speech_model_used', None)
            language = getattr(transcript, 'language_code', None)
            if language is None:
                jr = getattr(transcript, 'json_response', None) or {}
                language = jr.get('language_code')
            return {
                'success': True, 'status': 'completed',
                'transcript': segments, 'duration': duration,
                'model': str(model_used) if model_used else None,
                'language': str(language) if language else None,
            }

        # queued of processing — nog bezig.
        return {'success': True, 'status': status}
    except Exception as e:
        logger.error(f"AssemblyAI poll error (transcript_id={transcript_id}): {e}")
        return {'success': False, 'error': str(e)}
