from typing import Dict, Tuple

import cv2
import numpy as np

from app.utils.normalization import clamp01


class ArtifactAnalyzer:
    """Heuristic artifact detector using edge/texture cues."""

    def analyze(
        self, image: np.ndarray, face_box: Tuple[int, int, int, int] | None = None
    ) -> Dict[str, float | bool]:
        if image is None or image.size == 0:
            return {"artifact_flag": False, "score": 0.0}

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        h, w = gray.shape

        if face_box:
            x, y, fw, fh = face_box
            x = max(0, min(x, w - 1))
            y = max(0, min(y, h - 1))
            fw = max(1, min(fw, w - x))
            fh = max(1, min(fh, h - y))
            face_region = gray[y : y + fh, x : x + fw]
        else:
            face_region = gray

        lap_full = cv2.Laplacian(gray, cv2.CV_32F)
        lap_face = cv2.Laplacian(face_region, cv2.CV_32F)
        var_full = float(np.var(lap_full))
        var_face = float(np.var(lap_face))
        sharpness_ratio = var_face / (var_full + 1e-6)
        sharpness_score = clamp01((0.6 - sharpness_ratio) / 0.6)

        boundary_score = 0.0
        edge_density_inner = 0.0
        edge_density_boundary = 0.0
        edges = cv2.Canny((gray * 255).astype(np.uint8), 100, 200)
        if face_box:
            thickness = max(2, min(fw, fh) // 12)
            x0 = max(0, x - thickness)
            y0 = max(0, y - thickness)
            x1 = min(w, x + fw + thickness)
            y1 = min(h, y + fh + thickness)

            inner_edges = edges[y : y + fh, x : x + fw]
            boundary_band = edges[y0:y1, x0:x1].copy()
            boundary_band[thickness:-thickness, thickness:-thickness] = 0

            edge_density_inner = float(inner_edges.mean() / 255.0)
            edge_density_boundary = float(boundary_band.mean() / 255.0)
        else:
            edge_density_inner = float(edges.mean() / 255.0)
            edge_density_boundary = edge_density_inner

        diff = abs(edge_density_boundary - edge_density_inner)
        denom = max(edge_density_boundary, edge_density_inner, 1e-6)
        boundary_score = clamp01(diff / denom)

        eye_score = 0.0
        if face_box and face_region.shape[1] >= 2:
            upper = face_region[: face_region.shape[0] // 2, :]
            mid = upper.shape[1] // 2
            left = upper[:, :mid]
            right = upper[:, mid:]
            right_flipped = cv2.flip(right, 1)
            min_w = min(left.shape[1], right_flipped.shape[1])
            left = left[:, :min_w]
            right_flipped = right_flipped[:, :min_w]
            symmetry = float(np.mean(np.abs(left - right_flipped)))
            eye_score = clamp01(symmetry / 0.2)

        score = clamp01(0.35 * sharpness_score + 0.4 * boundary_score + 0.25 * eye_score)
        return {"artifact_flag": score > 0.6, "score": float(score)}
