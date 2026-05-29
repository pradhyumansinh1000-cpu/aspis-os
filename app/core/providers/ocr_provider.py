"""
app/core/providers/ocr_provider.py — OCR Provider Abstraction Layer

Defines the abstract OCRProvider interface and the concrete dual-engine PaddleTesseractOCRProvider.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from PIL import Image
import structlog
from app.config import settings
from app.core.exceptions import FileProcessingError

logger = structlog.get_logger()

class OCRProvider(ABC):
    """
    Abstract interface for executing OCR on image files.
    """
    
    @abstractmethod
    def extract_text(self, image: Image.Image) -> Dict[str, Any]:
        """
        Extract text from a single page PIL Image.
        
        Returns:
            Dict containing:
                "text": str (extracted text content)
                "confidence": float (average character/word confidence level 0.0 - 1.0)
                "engine": str ("paddleocr" or "tesseract")
        """
        pass


class PaddleTesseractOCRProvider(OCRProvider):
    """
    PaddleOCR + Tesseract fallback dual-engine OCR Provider.
    """

    def __init__(self):
        self._paddle_ocr = None
        self.engine_preference = settings.OCR_ENGINE

    def _get_paddle_ocr(self) -> Any:
        if self._paddle_ocr is None:
            try:
                from paddleocr import PaddleOCR
                self._paddle_ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
                logger.info("PaddleOCR engine loaded")
            except ImportError:
                logger.warning("PaddleOCR package missing, falling back to Tesseract only")
        return self._paddle_ocr

    def extract_text(self, image: Image.Image) -> Dict[str, Any]:
        paddle_text = ""
        paddle_conf = 0.0
        
        paddle = self._get_paddle_ocr()
        if paddle is not None:
            try:
                import numpy as np
                img_array = np.array(image)
                result = paddle.ocr(img_array, cls=True)
                if result and result[0]:
                    lines = []
                    confidences = []
                    for line in result[0]:
                        lines.append(line[1][0])
                        confidences.append(line[1][1])
                    paddle_text = "\n".join(lines)
                    paddle_conf = sum(confidences) / len(confidences) if confidences else 0.0
            except Exception as e:
                logger.warning("PaddleOCR inference failed, falling back to Tesseract", error=str(e))

        tesseract_text = ""
        tesseract_conf = 0.0
        try:
            import pytesseract
            # Get Tesseract output data
            text = pytesseract.image_to_string(image, config="--oem 3 --psm 6")
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            confidences = [c for c in data["conf"] if c > 0]
            avg_conf = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            tesseract_text = text
            tesseract_conf = avg_conf
        except Exception as e:
            logger.warning("Tesseract OCR fallback failed", error=str(e))

        # Decision Matrix
        if self.engine_preference == "tesseract":
            return {"text": tesseract_text, "confidence": tesseract_conf, "engine": "tesseract"}
        elif self.engine_preference == "paddleocr":
            return {"text": paddle_text, "confidence": paddle_conf, "engine": "paddleocr"}
        else: # both
            if tesseract_conf > paddle_conf:
                return {"text": tesseract_text, "confidence": tesseract_conf, "engine": "tesseract"}
            return {"text": paddle_text, "confidence": paddle_conf, "engine": "paddleocr"}
