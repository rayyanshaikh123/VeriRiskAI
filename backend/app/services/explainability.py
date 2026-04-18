from typing import Dict, Optional


class ExplainabilityService:
    def generate(self, signals: Dict[str, float]) -> Dict[str, Optional[object]]:
        """Return explainability artifacts (stub)."""
        return {"heatmap_url": None, "metadata": {}}
