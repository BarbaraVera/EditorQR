import asyncio
import io
import logging
import time

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import Response
from PIL import Image
from rembg import remove
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("editorqr")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="EditorQR API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_CONTENT_LENGTH = 6 * 1024 * 1024  # 6 MB (un poco mayor por b64 overhead)
PROCESSING_TIMEOUT = 30  # segundos


@app.middleware("http")
async def limitar_body(request: Request, call_next):
    """Rechaza antes de leer si Content-Length excede el límite."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_CONTENT_LENGTH:
        logger.warning(
            "Body rechazado por tamaño — %s bytes desde %s",
            content_length,
            request.client.host if request.client else "desconocido",
        )
        return Response(
            content='{"detail": "Archivo demasiado grande."}',
            status_code=413,
            media_type="application/json",
        )
    return await call_next(request)


def validar_firma(contents: bytes) -> bool:
    if contents[:4] == b"\x89PNG":
        return True
    if contents[:3] == b"\xff\xd8\xff":
        return True
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return True
    return False


def procesar_imagen(contents: bytes) -> bytes:
    """Ejecuta Pillow + rembg (CPU-bound, se llama desde un thread pool)."""
    start = time.perf_counter()
    input_image = Image.open(io.BytesIO(contents))
    output_image = remove(
        input_image,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )
    img_byte_arr = io.BytesIO()
    output_image.save(img_byte_arr, format="PNG", compress_level=3)
    elapsed = time.perf_counter() - start
    logger.info("Imagen procesada en %.2fs", elapsed)
    return img_byte_arr.getvalue()


@app.post("/api/remove-bg")
@limiter.limit("10/minute")
async def remove_background(request: Request, file: UploadFile = File(...)):
    # 1. MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        logger.warning("MIME rechazado: %s", file.content_type)
        raise HTTPException(
            status_code=400,
            detail=f"Tipo '{file.content_type}' no soportado. Solo PNG, JPEG y WebP.",
        )

    # 2. Leer contenido
    contents = await file.read()

    # 3. Tamaño máximo
    if len(contents) > MAX_FILE_SIZE:
        logger.warning("Archivo excede 5 MB: %d bytes", len(contents))
        raise HTTPException(
            status_code=400,
            detail=f"El archivo excede el límite de 5 MB ({len(contents)} bytes).",
        )

    # 4. Magic bytes
    if not validar_firma(contents):
        logger.warning("Firma inválida — primeros 12 bytes: %s", contents[:12].hex())
        raise HTTPException(
            status_code=400,
            detail="El archivo no es una imagen válida (PNG, JPEG o WebP).",
        )

    # 5. Procesar con timeout y en thread pool
    try:
        loop = asyncio.get_running_loop()
        resultado = await asyncio.wait_for(
            loop.run_in_executor(None, procesar_imagen, contents),
            timeout=PROCESSING_TIMEOUT,
        )
    except asyncio.TimeoutError:
        logger.error("Timeout de %ds al procesar imagen", PROCESSING_TIMEOUT)
        raise HTTPException(
            status_code=504,
            detail=f"El procesamiento excedió el tiempo límite ({PROCESSING_TIMEOUT}s).",
        )

    return Response(content=resultado, media_type="image/png")
