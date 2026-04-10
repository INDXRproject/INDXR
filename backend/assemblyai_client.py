import assemblyai as aai
import os
import logging

logger = logging.getLogger("indxr-backend")

aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

def transcribe_with_assemblyai(audio_path: str) -> dict:
    """
    Transcribe audio file using AssemblyAI Universal-3 Pro.
    Returns dict matching existing whisper_client format:
    { 'success': bool, 'transcript': [...], 'duration': float, 'error': str }
    """
    try:
        config = aai.TranscriptionConfig(
            speech_models=["universal-3-pro", "universal-2"],
            punctuate=True,
            format_text=True,
        )

        transcriber = aai.Transcriber(config=config)
        transcript = transcriber.transcribe(audio_path)

        if transcript.status == aai.TranscriptStatus.error:
            return {'success': False, 'error': transcript.error}

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
            'duration': duration
        }

    except Exception as e:
        logger.error(f"AssemblyAI transcription error: {e}")
        return {'success': False, 'error': str(e)}
