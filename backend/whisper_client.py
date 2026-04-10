"""
OpenAI Whisper API client for INDXR.AI
Uses httpx for custom retry logic (credits only deducted on success)
"""

import os
import time
import logging
from typing import Dict, List, Optional
import httpx

logger = logging.getLogger("indxr-backend")

# OpenAI API Configuration
OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions"
DEFAULT_MODEL = "gpt-4o-transcribe"
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # Exponential backoff in seconds


def transcribe_audio(
    file_path: str,
    model: Optional[str] = None,
    language: Optional[str] = None
) -> Dict:
    """
    Transcribe audio file using OpenAI Whisper API with custom retry logic.
    
    Args:
        file_path: Path to audio file
        model: Whisper model to use (default from env or gpt-4o-transcribe)
        language: Optional language code (e.g., 'en', 'es')
        
    Returns:
        Dict with keys:
            - success (bool): Whether transcription succeeded
            - transcript (list): List of {text, offset, duration} dicts
            - error (str): Error message if failed
            - duration (float): Total audio duration in seconds
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            'success': False,
            'error': "OpenAI API key not configured",
            'transcript': None
        }
    
    model = model or os.getenv("WHISPER_MODEL", DEFAULT_MODEL)
    
    logger.info(f"Starting Whisper transcription: {file_path} (model: {model})")
    
    # Prepare request
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "model": model,
        "response_format": "verbose_json"  # Get timestamps
    }
    
    if language:
        data["language"] = language
    
    # Retry loop
    last_error = None
    
    for attempt in range(MAX_RETRIES):
        try:
            with open(file_path, 'rb') as audio_file:
                files = {
                    'file': (os.path.basename(file_path), audio_file, 'audio/mpeg')
                }
                
                logger.info(f"Whisper API call attempt {attempt + 1}/{MAX_RETRIES}")
                
                with httpx.Client(timeout=1800.0) as client:  # 30 minute timeout for long audio files
                    response = client.post(
                        OPENAI_API_URL,
                        headers=headers,
                        data=data,
                        files=files
                    )
                
                # Check response
                if response.status_code == 200:
                    result = response.json()
                    transcript = format_whisper_response(result)
                    
                    logger.info(f"Whisper transcription successful: {len(transcript)} segments")
                    
                    return {
                        'success': True,
                        'transcript': transcript,
                        'error': None,
                        'duration': result.get('duration', 0)
                    }
                
                # Handle errors
                elif 400 <= response.status_code < 500:
                    # Client error - don't retry
                    error_msg = f"Whisper API error {response.status_code}: {response.text}"
                    logger.error(error_msg)
                    return {
                        'success': False,
                        'error': error_msg,
                        'transcript': None
                    }
                
                else:
                    # Server error - retry
                    last_error = f"Whisper API error {response.status_code}: {response.text}"
                    logger.warning(f"{last_error} - retrying...")
                    
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAYS[attempt])
                    continue
        
        except httpx.TimeoutException as e:
            last_error = f"Whisper API timeout: {str(e)}"
            logger.warning(f"{last_error} - retrying...")
            
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
            continue
        
        except Exception as e:
            last_error = f"Whisper API error: {str(e)}"
            logger.error(last_error)
            
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
            continue
    
    # All retries failed
    logger.error(f"Whisper transcription failed after {MAX_RETRIES} attempts: {last_error}")
    return {
        'success': False,
        'error': last_error or "Whisper API failed after multiple retries",
        'transcript': None
    }


def format_whisper_response(api_response: Dict) -> List[Dict]:
    """
    Convert Whisper API response to INDXR format.
    
    Args:
        api_response: Raw response from Whisper API
        
    Returns:
        List of dicts with keys: text, offset, duration
    """
    transcript = []
    
    # Extract segments
    segments = api_response.get('segments', [])
    
    for segment in segments:
        # Calculate duration
        start = segment.get('start', 0)
        end = segment.get('end', start)
        duration = end - start
        
        transcript.append({
            'text': segment.get('text', '').strip(),
            'offset': start,
            'duration': max(duration, 0.1)  # Minimum 0.1s
        })
    
    # If no segments, use full text
    if not transcript and 'text' in api_response:
        transcript.append({
            'text': api_response['text'].strip(),
            'offset': 0.0,
            'duration': api_response.get('duration', 0.0)
        })
    
    return transcript
