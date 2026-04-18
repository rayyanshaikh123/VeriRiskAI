import base64
import binascii
from io import BytesIO
from typing import Iterable

from PIL import Image, UnidentifiedImageError


class ImageValidationError(ValueError):
    def __init__(self, message: str, error_code: str) -> None:
        super().__init__(message)
        self.error_code = error_code


class VideoValidationError(ValueError):
    def __init__(self, message: str, error_code: str) -> None:
        super().__init__(message)
        self.error_code = error_code


def validate_image_size(decoded: bytes, max_bytes: int, error_code: str) -> None:
    if len(decoded) > max_bytes:
        raise ImageValidationError("Image payload exceeds size limit", error_code)


def validate_image_format(image: Image.Image, allowed_formats: Iterable[str], error_code: str) -> None:
    if image.format not in set(allowed_formats):
        raise ImageValidationError("Unsupported image format", error_code)


def enforce_pixel_limit(image: Image.Image, max_pixels: int, error_code: str) -> None:
    if image.width * image.height > max_pixels:
        raise ImageValidationError("Image exceeds pixel limit", error_code)


def validate_base64_image(
    payload: str,
    max_bytes: int,
    allowed_formats: Iterable[str],
    error_code: str,
    max_pixels: int | None = None,
) -> bytes:
    if not payload or not payload.strip():
        raise ImageValidationError("Image payload is empty", error_code)
    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ImageValidationError("Invalid base64 payload", error_code) from exc
    validate_image_size(decoded, max_bytes, error_code)
    try:
        with Image.open(BytesIO(decoded)) as image:
            image.verify()
            validate_image_format(image, allowed_formats, error_code)
            if max_pixels is not None:
                enforce_pixel_limit(image, max_pixels, error_code)
    except UnidentifiedImageError as exc:
        raise ImageValidationError("Invalid image payload", error_code) from exc
    return decoded


def _detect_video_format(decoded: bytes) -> str | None:
    header = decoded[:32]
    if len(header) >= 12 and header[4:8] == b"ftyp":
        return "MP4"
    if header[:4] == b"\x1a\x45\xdf\xa3":
        return "WEBM"
    return None


def validate_base64_video(
    payload: str,
    max_bytes: int,
    allowed_formats: Iterable[str],
    error_code: str,
) -> bytes:
    if not payload or not payload.strip():
        raise VideoValidationError("Video payload is empty", error_code)
    try:
        decoded = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise VideoValidationError("Invalid base64 payload", error_code) from exc
    if len(decoded) > max_bytes:
        raise VideoValidationError("Video payload exceeds size limit", error_code)
    allowed = {fmt.upper() for fmt in allowed_formats}
    if allowed:
        detected = _detect_video_format(decoded)
        if not detected or detected not in allowed:
            raise VideoValidationError("Unsupported video format", error_code)
    return decoded
