from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response
from rembg import remove
from PIL import Image
import io

app = FastAPI(title="QR Dinámico API")


@app.post("/api/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    input_image = Image.open(file.file)
    output_image = remove(
        input_image,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )

    img_byte_arr = io.BytesIO()
    output_image.save(img_byte_arr, format="PNG", compress_level=3)
    img_byte_arr = img_byte_arr.getvalue()

    return Response(content=img_byte_arr, media_type="image/png")
