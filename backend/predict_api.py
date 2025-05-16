# predict_api.py (Python < 3.6 Compatibility - Requires FastAPI/Uvicorn compatible version)

import io
import logging
import asyncio
from typing import List, Optional
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel # Ensure pydantic version is compatible with Python/FastAPI version

# --- Placeholder Libraries ---
try: from PIL import Image
except ImportError: Image = None; logging.warning("Pillow not installed.")
try: import soundfile as sf
except ImportError: sf = None; logging.warning("SoundFile not installed.")
# --- End Placeholder Libraries ---

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Multi-Modal Prediction API")

# --- CORS Middleware ---
origins = ["*"] # Allow all for testing - CHANGE FOR PRODUCTION
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Model ---
class PredictionResponse(BaseModel):
    prediction: str
    probabilities: List[float]

# --- ML Model Placeholders ---
RISK_CLASSES = ["Low", "Medium", "High"]

async def process_text(text: str) -> List[float]:
    """Placeholder: Processes text. Replace with your model."""
    logger.info("Processing text (length: {})...".format(len(text))) # Use .format()
    await asyncio.sleep(0.05)
    if "danger" in text.lower() or "help" in text.lower(): probs = [0.1, 0.3, 0.6]
    elif "suspicious" in text.lower(): probs = [0.2, 0.6, 0.2]
    else: probs = [0.7, 0.2, 0.1]
    logger.info("Text probabilities: {}".format(probs)) # Use .format()
    if len(probs) != 3: raise ValueError("Text model output must be 3 probabilities.")
    return probs

async def process_image(image_bytes: bytes) -> List[float]:
    """Placeholder: Processes image bytes. Replace with your model."""
    logger.info("Processing image (size: {} bytes)...".format(len(image_bytes))) # Use .format()
    if not Image: raise RuntimeError("Pillow library is required.")
    try:
        await asyncio.sleep(0.2)
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        if width > 1000 or height > 1000: probs = [0.2, 0.3, 0.5]
        else: probs = [0.6, 0.3, 0.1]
        logger.info("Image probabilities: {}".format(probs)) # Use .format()
        if len(probs) != 3: raise ValueError("Image model output must be 3 probabilities.")
        return probs
    except Exception as e:
        logger.error("Error processing image: {}".format(e), exc_info=True) # Use .format()
        return [1/3, 1/3, 1/3]

async def process_audio(audio_bytes: bytes) -> List[float]:
    """Placeholder: Processes audio bytes. Replace with your model."""
    logger.info("Processing audio (size: {} bytes)...".format(len(audio_bytes))) # Use .format()
    if not sf: raise RuntimeError("SoundFile library is required.")
    try:
        await asyncio.sleep(0.15)
        audio_data, samplerate = sf.read(io.BytesIO(audio_bytes))
        duration_seconds = len(audio_data) / samplerate
        logger.info("Audio duration: {:.2f}s, Sample rate: {}Hz".format(duration_seconds, samplerate)) # Use .format()
        if duration_seconds > 10: probs = [0.1, 0.4, 0.5]
        else: probs = [0.5, 0.4, 0.1]
        logger.info("Audio probabilities: {}".format(probs)) # Use .format()
        if len(probs) != 3: raise ValueError("Audio model output must be 3 probabilities.")
        return probs
    except Exception as e:
        logger.error("Error processing audio: {}".format(e), exc_info=True) # Use .format()
        return [1/3, 1/3, 1/3]

async def fuse_predictions(
    text_probs: Optional[List[float]], image_probs: Optional[List[float]], audio_probs: Optional[List[float]],
    weights: dict = {"text": 0.5, "image": 0.25, "audio": 0.25}
) -> List[float]:
    """Placeholder: Fuses probabilities. Replace with your fusion logic."""
    logger.info("Fusing predictions...")
    fused_probs = np.array([0.0, 0.0, 0.0])
    total_weight = 0.0
    if isinstance(text_probs, list) and len(text_probs) == 3: fused_probs += np.array(text_probs) * weights["text"]; total_weight += weights["text"]
    if isinstance(image_probs, list) and len(image_probs) == 3: fused_probs += np.array(image_probs) * weights["image"]; total_weight += weights["image"]
    if isinstance(audio_probs, list) and len(audio_probs) == 3: fused_probs += np.array(audio_probs) * weights["audio"]; total_weight += weights["audio"]

    if total_weight == 0: return [1/3, 1/3, 1/3]
    fused_probs /= total_weight

    norm_sum = fused_probs.sum()
    if not np.isclose(norm_sum, 1.0) and norm_sum > 0: fused_probs /= norm_sum
    logger.info("Fused probabilities: {}".format(fused_probs.tolist())) # Use .format()
    return fused_probs.tolist()

def get_final_risk_level(fused_probs: List[float]) -> str:
    """Determines the final risk level class."""
    if not isinstance(fused_probs, list) or len(fused_probs) != 3:
         logger.error("Invalid fused probabilities for final level: {}".format(fused_probs)) # Use .format()
         return "Error"
    predicted_index = np.argmax(fused_probs)
    if 0 <= predicted_index < len(RISK_CLASSES): return RISK_CLASSES[predicted_index]
    else: logger.error("Prediction index {} out of bounds.".format(predicted_index)); return "Error" # Use .format()

# --- API Endpoint ---
@app.post("/api/predict-threat", response_model=PredictionResponse)
async def predict_threat(
    location: str = Form(...), type: str = Form(...), description: str = Form(...),
    image: Optional[UploadFile] = File(None), audio: Optional[UploadFile] = File(None)
):
    """Receives data, processes modalities, fuses results, returns prediction."""
    logger.info("Prediction request received. Location: {}, Type: {}".format(location, type)) # Use .format()
    image_bytes, audio_bytes = None, None

    # Read Files
    async def read_file(file: Optional[UploadFile], file_type: str) -> Optional[bytes]:
        if not file: return None
        try:
            logger.info("Reading {} file: {} ({})".format(file_type, file.filename, file.content_type)) # Use .format()
            content = await file.read(); await file.close()
            if not content: logger.warning("Uploaded {} file is empty.".format(file_type)); return None
            logger.info("{} read successfully ({} bytes).".format(file_type.capitalize(), len(content))) # Use .format()
            return content
        except Exception as e:
            logger.error("Error reading {} file: {}".format(file_type, e), exc_info=True) # Use .format()
            # Use .format() in detail string
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error reading {} file.".format(file_type)) from e

    try:
        results = await asyncio.gather(read_file(image, "image"), read_file(audio, "audio"), return_exceptions=True)
        read_errors = [res for res in results if isinstance(res, Exception)];
        if read_errors: raise read_errors[0]
        image_bytes, audio_bytes = results[0], results[1]
    except HTTPException as e: raise e
    except Exception as e:
        logger.error("Unexpected error during file reading: {}".format(e), exc_info=True) # Use .format()
        raise HTTPException(status_code=500, detail="Server error reading files.") from e

    # Process Modalities
    processing_tasks = [process_text(description)]
    if image_bytes: processing_tasks.append(process_image(image_bytes))
    if audio_bytes: processing_tasks.append(process_audio(audio_bytes))
    text_probs, image_probs, audio_probs = None, None, None
    try:
        results = await asyncio.gather(*processing_tasks, return_exceptions=True)
        task_index = 0
        if not isinstance(results[task_index], Exception): text_probs = results[task_index]
        else: logger.error("Text processing failed: {}".format(results[task_index])) # Use .format()
        task_index += 1
        if image_bytes:
            if not isinstance(results[task_index], Exception): image_probs = results[task_index]
            else: logger.error("Image processing failed: {}".format(results[task_index])) # Use .format()
            task_index +=1
        if audio_bytes:
            if not isinstance(results[task_index], Exception): audio_probs = results[task_index]
            else: logger.error("Audio processing failed: {}".format(results[task_index])) # Use .format()
        if text_probs is None: raise HTTPException(status_code=500, detail="Core text processing failed.")
    except HTTPException as e: raise e
    except Exception as e:
        logger.error("Error running model processing tasks: {}".format(e), exc_info=True) # Use .format()
        raise HTTPException(status_code=500, detail="Server error during model processing.") from e

    # Fuse Predictions
    try:
        fused_probabilities = await fuse_predictions(text_probs, image_probs, audio_probs)
        final_prediction = get_final_risk_level(fused_probabilities)
        if final_prediction == "Error": raise ValueError("Failed to determine final risk level.")
    except Exception as e:
        logger.error("Error during fusion/prediction: {}".format(e), exc_info=True) # Use .format()
        raise HTTPException(status_code=500, detail="Error combining prediction results.") from e

    logger.info("Final Prediction: {}".format(final_prediction)) # Use .format()
    return PredictionResponse(prediction=final_prediction, probabilities=fused_probabilities)

# --- Root Endpoint ---
@app.get("/")
async def read_root(): return {"message": "Multi-Modal Prediction API is running."}

# --- Exception Handlers ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled Internal Error: {}".format(exc), exc_info=True) # Use .format()
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# --- How to Run ---
# 1. Check Python version: python --version (Needs version compatible with FastAPI/Uvicorn used)
# 2. Install: pip install "fastapi==<version>" "uvicorn[standard]==<version>" python-multipart numpy Pillow soundfile pydantic==<version>
#    (Specify versions compatible with your older Python if not upgrading)
# 3. Save as predict_api.py
# 4. Run: uvicorn predict_api:app --reload --host 0.0.0.0 --port 8000