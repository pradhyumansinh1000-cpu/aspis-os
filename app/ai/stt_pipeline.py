"""
app/ai/stt_pipeline.py — Whisper Speech-to-Text Pipeline

Why local Whisper?
  - Zero cost per minute (vs. Google STT at $0.006/min = $360/1000 hours)
  - No PII sent to external APIs (student voices = sensitive data)
  - Works offline in schools with poor connectivity
  
Model size trade-off:
  - tiny: 39M params, fastest, less accurate (~English only)
  - base: 74M params, good balance for clear classroom audio
  - small: 244M params, better accent handling
  - large: 1.5B params, best accuracy, GPU recommended
  
For classrooms, 'base' usually suffices since audio is clean.
Use 'large' on GPU if budget allows.
"""

import os
import tempfile
import time
from pathlib import Path
from typing import Any

import structlog

from app.config import settings
from app.core.exceptions import AIServiceError, FileProcessingError

logger = structlog.get_logger()

SUPPORTED_AUDIO_TYPES = {
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/ogg": ".ogg",
    "video/mp4": ".mp4",       # Some recordings are video files
    "video/webm": ".webm",
}


class WhisperSTTPipeline:
    """
    Speech-to-text pipeline using OpenAI Whisper (local inference).
    
    Runs in a Celery worker — this is synchronous but CPU/GPU intensive.
    Not async because Whisper's Python API is synchronous.
    """

    def __init__(self):
        self._model = None  # Lazy-loaded

    def _get_model(self):
        """Lazy-load the Whisper model on first use."""
        if self._model is None:
            try:
                import whisper
                logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
                self._model = whisper.load_model(
                    settings.WHISPER_MODEL,
                    device=settings.WHISPER_DEVICE,  # "cpu" or "cuda"
                )
                logger.info("Whisper model loaded successfully")
            except ImportError:
                raise AIServiceError("Whisper", "openai-whisper not installed")
            except Exception as e:
                raise AIServiceError("Whisper", f"Failed to load model: {e}")
        return self._model

    def transcribe(self, audio_bytes: bytes, mime_type: str) -> dict[str, Any]:
        """
        Transcribe audio bytes to text.
        
        Returns:
          {
            "transcript": "Good morning students, today we study...",
            "language": "en",
            "segments": [
              {"start": 0.0, "end": 4.5, "text": "Good morning students"},
              ...
            ],
            "duration_seconds": 3612.0,
            "processing_time_ms": 45000,
          }
        """
        if mime_type not in SUPPORTED_AUDIO_TYPES:
            raise FileProcessingError(
                f"Unsupported audio format: {mime_type}. "
                f"Supported: {list(SUPPORTED_AUDIO_TYPES.keys())}"
            )

        ext = SUPPORTED_AUDIO_TYPES[mime_type]
        model = self._get_model()
        start = time.perf_counter()

        # Whisper needs a file path, not bytes — write to temp file
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(audio_bytes)

        try:
            logger.info(f"Starting Whisper transcription of {len(audio_bytes) / 1024 / 1024:.1f}MB audio")
            
            result = model.transcribe(
                tmp_path,
                # verbose=False: suppress per-segment progress output
                verbose=False,
                # fp16=False on CPU (no float16 support without GPU)
                fp16=(settings.WHISPER_DEVICE == "cuda"),
                # task="transcribe": plain transcription (vs "translate" for non-English)
                task="transcribe",
                # initial_prompt: helps Whisper understand context
                initial_prompt="This is a classroom lecture recording.",
                # word_timestamps: useful for future features (highlight words)
                word_timestamps=False,
            )
        except Exception as e:
            raise AIServiceError("Whisper", f"Transcription failed: {e}")
        finally:
            # Always clean up temp file
            os.unlink(tmp_path)

        duration_ms = int((time.perf_counter() - start) * 1000)
        audio_duration = result.get("segments", [{}])[-1].get("end", 0) if result.get("segments") else 0

        # Reconstruct clean segments list
        segments = [
            {
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "text": seg["text"].strip(),
            }
            for seg in result.get("segments", [])
        ]

        transcript = result["text"].strip()

        logger.info(
            "Transcription complete",
            language=result.get("language"),
            audio_seconds=round(audio_duration),
            processing_ms=duration_ms,
            words=len(transcript.split()),
        )

        return {
            "transcript": transcript,
            "language": result.get("language", "en"),
            "segments": segments,
            "duration_seconds": audio_duration,
            "processing_time_ms": duration_ms,
        }


# Singleton
_stt_pipeline: WhisperSTTPipeline | None = None


def get_stt_pipeline() -> WhisperSTTPipeline:
    global _stt_pipeline
    if _stt_pipeline is None:
        _stt_pipeline = WhisperSTTPipeline()
    return _stt_pipeline
