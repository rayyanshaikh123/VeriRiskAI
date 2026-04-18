from typing import Any, Dict, Optional

from fastapi import HTTPException

from app.schemas.common import ErrorCode


def raise_api_error(
    error_code: ErrorCode,
    message: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    raise HTTPException(
        status_code=status_code,
        detail={"error_code": error_code, "message": message, "details": details},
    )
