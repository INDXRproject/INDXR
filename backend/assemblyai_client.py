import assemblyai as aai
import os
import logging

logger = logging.getLogger("indxr-backend")

aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
# EU-endpoint (eu-west-1) voor data-residency — alle async transcriptie draait in de EU.
aai.settings.base_url = "https://api.eu.assemblyai.com"

def transcribe_with_assemblyai(audio_path: str) -> dict:
    """
    Transcribe audio file using AssemblyAI's highest-quality model available for the
    detected language. speech_models is a LANGUAGE ROUTER, not an error-fallback list:
    Universal-3.5 Pro covers 18 languages natively; any other language is served by
    Universal-2 (99 languages). Chain = ["universal-3-5-pro", "universal-2"] per
    AssemblyAI's own recommendation. universal-3-pro is intentionally omitted: its 6
    native languages are all a subset of Universal-3.5 Pro's 18, so with 3.5 Pro listed
    first it could never be selected (ADR-071). language_detection MUST be on so the
    router can pick per detected language. Valid AssemblyAI ids use dashes:
    "universal-3-5-pro" (NOT "universal-3.5-pro"). Both share the EU endpoint.
    Returns dict matching existing whisper_client format:
    { 'success': bool, 'transcript': [...], 'duration': float, 'model': str }
    """
    try:
        config = aai.TranscriptionConfig(
            speech_models=["universal-3-5-pro", "universal-2"],
            language_detection=True,
            punctuate=True,
            format_text=True,
        )

        transcriber = aai.Transcriber(config=config)
        transcript = transcriber.transcribe(audio_path)

        if transcript.status == aai.TranscriptStatus.error:
            return {'success': False, 'error': transcript.error}

        # Effective model AssemblyAI actually ran (the language router picks one of the
        # requested speech_models for the detected language). Captured per job for per-model
        # cost accounting — transcription_jobs.assemblyai_model drives the COR rate (ADR-070):
        # universal-2 = $0.15/hr, universal-3-pro / universal-3-5-pro = $0.21/hr.
        model_used = getattr(transcript, 'speech_model_used', None)

        # Convert AssemblyAI words to ~5 second segments matching our format
        segments = []
        if transcript.words:
            current_segment = []
            segment_start = None

            for word in transcript.words:
                if segment_start is None:
                    segment_start = word.start / 1000.0

                current_segment.append(word.text)
                word_end = word.end / 1000.0

                if (word_end - segment_start) >= 5.0:
                    segments.append({
                        'text': ' '.join(current_segment),
                        'offset': segment_start,
                        'duration': word_end - segment_start
                    })
                    current_segment = []
                    segment_start = None

            if current_segment and segment_start is not None:
                last_word = transcript.words[-1]
                segments.append({
                    'text': ' '.join(current_segment),
                    'offset': segment_start,
                    'duration': (last_word.end / 1000.0) - segment_start
                })

        duration = 0
        if segments:
            last = segments[-1]
            duration = last['offset'] + last['duration']

        return {
            'success': True,
            'transcript': segments,
            'duration': duration,
            'model': model_used
        }

    except Exception as e:
        logger.error(f"AssemblyAI transcription error: {e}")
        return {'success': False, 'error': str(e)}
