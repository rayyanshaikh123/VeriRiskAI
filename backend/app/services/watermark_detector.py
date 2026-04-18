import cv2
import numpy as np
from PIL import Image, ExifTags


class WatermarkDetector:
    def __init__(self):
        # Tunable thresholds
        self.sd_threshold = 0.6
        self.block_threshold = 0.02
        self.score_threshold = 0.6

    # ---------------------------
    # MAIN ENTRY
    # ---------------------------
    def analyze(self, image: np.ndarray) -> dict:
        """
        Args:
            image: BGR image (OpenCV format)

        Returns:
            dict with watermark-related signals
        """

        sd_flag, sd_score = self._detect_sd_pattern(image)
        compression_flag = self._detect_compression(image)
        metadata_flag = self._check_metadata(image)

        watermark_score = (
            0.6 * sd_score +
            0.2 * float(compression_flag) +
            0.2 * float(metadata_flag)
        )

        watermark_score = float(np.clip(watermark_score, 0.0, 1.0))

        watermark_detected = watermark_score >= self.score_threshold

        return {
            "sd_pattern_detected": sd_flag,
            "compression_tamper_flag": compression_flag,
            "metadata_flag": metadata_flag,
            "watermark_score": watermark_score,
            "watermark_detected": watermark_detected,
        }

    def detect(self, image: np.ndarray) -> dict:
        return self.analyze(image)

    # ---------------------------
    # 1. SD PATTERN (FFT)
    # ---------------------------
    def _detect_sd_pattern(self, image: np.ndarray):
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # FFT
            fft = np.fft.fft2(gray)
            fft_shift = np.fft.fftshift(fft)
            magnitude = np.log(np.abs(fft_shift) + 1)

            # Normalize
            magnitude = cv2.normalize(magnitude, None, 0, 1, cv2.NORM_MINMAX)

            h, w = magnitude.shape
            ch, cw = h // 2, w // 2

            # Remove low-frequency center
            radius = int(min(h, w) * 0.1)
            mask = np.ones_like(magnitude)
            mask[ch-radius:ch+radius, cw-radius:cw+radius] = 0

            high_freq = magnitude * mask

            mean_val = np.mean(high_freq)
            max_val = np.max(high_freq)

            if mean_val == 0:
                return False, 0.0

            peak_ratio = max_val / (mean_val + 1e-6)

            # Normalize
            score = min(peak_ratio / 10.0, 1.0)

            return score > self.sd_threshold, float(score)

        except Exception:
            return False, 0.0

    # ---------------------------
    # 2. COMPRESSION DETECTION
    # ---------------------------
    def _detect_compression(self, image: np.ndarray):
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape

            block = 8
            v_diff = 0
            h_diff = 0

            for i in range(block, h, block):
                v_diff += np.sum(np.abs(gray[i, :] - gray[i - 1, :]))

            for j in range(block, w, block):
                h_diff += np.sum(np.abs(gray[:, j] - gray[:, j - 1]))

            score = (v_diff + h_diff) / (h * w)

            return score > self.block_threshold

        except Exception:
            return False

    # ---------------------------
    # 3. METADATA CHECK
    # ---------------------------
    def _check_metadata(self, image: np.ndarray):
        try:
            pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            exif = pil_img.getexif()

            if exif is None or len(exif) == 0:
                return False

            for tag_id, value in exif.items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                if tag == "Software":
                    return True

            return False

        except Exception:
            return False