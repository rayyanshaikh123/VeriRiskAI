import logging
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.verify import router as verify_router
from app.core.config import settings
from app.schemas.common import ErrorCode
from app.utils.response import error_envelope

app = FastAPI(title="VerifyIQ API", version="1.0.0")

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(verify_router, prefix="/v1")


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    envelope = error_envelope(
        request,
        ErrorCode.VALIDATION_ERROR,
        "Validation error",
        details={"errors": exc.errors()},
    )
    return JSONResponse(status_code=422, content=envelope.model_dump(mode="json"))


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    error_code = detail.get("error_code", ErrorCode.INTERNAL_ERROR)
    if isinstance(error_code, str) and error_code in ErrorCode._value2member_map_:
        error_code = ErrorCode(error_code)
    message = detail.get("message", "Request failed")
    details = detail.get("details")
    envelope = error_envelope(request, error_code, message, details=details)
    return JSONResponse(status_code=exc.status_code, content=envelope.model_dump(mode="json"))


@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    error_code = detail.get("error_code", ErrorCode.INTERNAL_ERROR)
    if isinstance(error_code, str) and error_code in ErrorCode._value2member_map_:
        error_code = ErrorCode(error_code)
    message = detail.get("message", "Request failed")
    details = detail.get("details")
    envelope = error_envelope(request, error_code, message, details=details)
    return JSONResponse(status_code=exc.status_code, content=envelope.model_dump(mode="json"))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    envelope = error_envelope(request, ErrorCode.INTERNAL_ERROR, "Internal error")
    return JSONResponse(status_code=500, content=envelope.model_dump(mode="json"))
