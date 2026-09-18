import io
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "cropcare_model.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"


# ============================================================
# MODEL CONFIG
# ============================================================

IMAGE_SIZE = (224, 224)
CONFIDENCE_THRESHOLD = 0.65
MODEL_VERSION = "v1.0.0"


# ============================================================
# SUPPORTED CROPS
# ============================================================

SUPPORTED_CROPS = {
    "tomato",
    "potato",
    "maize",
    "grape",
    "apple",
}


# ============================================================
# LOAD CLASS NAMES
# ============================================================

def load_class_names():
    """
    Loads class_names.json.

    The JSON uses string keys:
    {
        "0": "Apple___Apple_scab",
        "1": "Apple___Black_rot",
        ...
    }

    Convert keys to integers so model class indices
    can be used directly.
    """

    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    return {int(key): value for key, value in data.items()}


# ============================================================
# LOAD MODEL ONCE
# ============================================================

print("Loading CropCare AI model...")

MODEL = tf.keras.models.load_model(MODEL_PATH)

CLASS_NAMES = load_class_names()

print("CropCare AI model loaded successfully!")
print("Model input:", MODEL.input_shape)
print("Model output:", MODEL.output_shape)
print("Number of classes:", len(CLASS_NAMES))


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def normalize_crop_name(crop: str) -> str:
    """
    Normalizes crop names for comparison.
    """

    crop = crop.strip().lower()

    if crop == "corn":
        return "maize"

    return crop


def get_crop_from_class(class_name: str) -> str:
    """
    Extracts crop name from model class.

    Example:
    Tomato___Early_blight -> Tomato
    Corn_(maize)___Common_rust_ -> Maize
    """

    crop = class_name.split("___")[0].strip().lower()

    if crop == "corn_(maize)":
        return "maize"

    if crop == "corn":
        return "maize"

    return crop


def get_condition_name(class_name: str) -> str:
    """
    Converts model class name into user-friendly condition name.
    """

    if "___" not in class_name:
        return class_name

    condition = class_name.split("___", 1)[1]

    replacements = {
        "healthy": "Healthy",
        "Early_blight": "Early Blight",
        "Late_blight": "Late Blight",
        "Black_rot": "Black Rot",
        "Apple_scab": "Apple Scab",
        "Cedar_apple_rust": "Cedar Apple Rust",
        "Bacterial_spot": "Bacterial Spot",
        "Leaf_Mold": "Leaf Mold",
        "Septoria_leaf_spot": "Septoria Leaf Spot",
        "Target_Spot": "Target Spot",
        "Tomato_Yellow_Leaf_Curl_Virus": "Tomato Yellow Leaf Curl Virus",
        "Tomato_mosaic_virus": "Tomato Mosaic Virus",
        "Spider_mites Two-spotted_spider_mite": "Spider Mites",
        "Common_rust_": "Common Rust",
        "Northern_Leaf_Blight": "Northern Leaf Blight",
        "Cercospora_leaf_spot Gray_leaf_spot": "Gray Leaf Spot",
        "Esca_(Black_Measles)": "Esca (Black Measles)",
        "Leaf_blight_(Isariopsis_Leaf_Spot)": "Leaf Blight",
    }

    if condition in replacements:
        return replacements[condition]

    return (
        condition
        .replace("_", " ")
        .replace("(", "")
        .replace(")", "")
        .strip()
        .title()
    )


def is_healthy_class(class_name: str) -> bool:
    return class_name.lower().endswith("___healthy")


def get_prediction_type(class_name: str) -> str:
    """
    Determines whether the prediction represents
    healthy, disease, or pest.
    """

    if is_healthy_class(class_name):
        return "healthy"

    lower_name = class_name.lower()

    if "spider_mite" in lower_name:
        return "pest"

    return "disease"


def estimate_severity(confidence: float) -> str:
    """
    Simple screening severity based on confidence.

    NOTE:
    This is NOT actual biological disease severity.
    """

    if confidence < CONFIDENCE_THRESHOLD:
        return "unknown"

    if confidence >= 0.90:
        return "high"

    if confidence >= 0.75:
        return "medium"

    return "low"


def get_symptoms(condition: str, prediction_type: str) -> list:
    """
    Generic user-friendly symptoms.
    """

    if prediction_type == "healthy":
        return [
            "No major visible disease symptoms detected."
        ]

    if prediction_type == "pest":
        return [
            "Possible pest-related damage or leaf symptoms.",
            "Inspect the plant closely for visible insects or feeding damage.",
        ]

    return [
        "Visible leaf discoloration or spotting may be present.",
        "Inspect affected leaves and nearby plants for similar symptoms.",
    ]


def get_recommendations(condition: str, prediction_type: str) -> list:
    """
    Provides safe, general recommendations.
    """

    if prediction_type == "healthy":
        return [
            "Continue regular crop monitoring.",
            "Maintain proper irrigation and field hygiene.",
            "Check plants regularly for new symptoms.",
        ]

    if prediction_type == "pest":
        return [
            "Inspect affected plants and nearby plants carefully.",
            "Remove severely affected plant material where appropriate.",
            "Monitor the crop regularly for increasing pest activity.",
            "Consult a local agricultural expert before using any pesticide.",
        ]

    return [
        "Inspect affected leaves and nearby plants.",
        "Remove severely affected plant material where appropriate.",
        "Avoid unnecessary overhead irrigation.",
        "Maintain good field sanitation.",
        "Consult a local agricultural expert for treatment confirmation.",
    ]


def uncertain_response(crop: str, confidence: float) -> dict:
    """
    Safe response when model confidence is below threshold.
    """

    return {
        "prediction_type": "uncertain",
        "crop": crop,
        "condition": "Unable to determine reliably",
        "confidence": round(float(confidence), 4),
        "severity": "unknown",
        "symptoms": [
            "The image could not be classified with enough confidence."
        ],
        "recommendations": [
            "Capture a clearer photo of the affected leaf.",
            "Make sure the leaf is well lit and clearly visible.",
            "Try another image showing the affected area closely.",
            "Consult a local agricultural expert if symptoms continue.",
        ],
        "explainability_image_url": None,
        "model_version": MODEL_VERSION,
        "status": "ok",
    }


from services.gradcam_service import GradCAMService


# ============================================================
# PREDICTION SERVICE
# ============================================================

class PredictionService:

    def __init__(self):
        self.model = MODEL
        self.class_names = CLASS_NAMES
        self.gradcam = GradCAMService(self.model, "top_activation")

    # --------------------------------------------------------
    # IMPORTANT: Used by routes/analysis.py
    # --------------------------------------------------------

    def is_supported_crop(self, crop: str) -> bool:
        """
        Checks whether the requested crop is supported
        by the current model.
        """

        if not crop:
            return False

        normalized_crop = normalize_crop_name(crop)

        return normalized_crop in SUPPORTED_CROPS

    # --------------------------------------------------------

    def preprocess_image(self, image_bytes: bytes):
        """
        Converts uploaded image bytes into model input.

        IMPORTANT:
        EfficientNet preprocessing is already part of the
        trained model graph, so we do NOT manually normalize
        the image here.
        """

        image = Image.open(io.BytesIO(image_bytes))

        # Convert everything to RGB
        image = image.convert("RGB")

        # Resize to model input size
        image = image.resize(IMAGE_SIZE)

        # Convert to numpy
        image_array = np.asarray(image, dtype=np.float32)

        # Add batch dimension
        image_array = np.expand_dims(image_array, axis=0)

        return image_array

    # --------------------------------------------------------

    def predict(
        self,
        image_bytes: bytes,
        crop: str,
        analysis_type: str = "disease",
    ) -> dict:

        try:

            # ------------------------------------------------
            # Validate crop
            # ------------------------------------------------

            if not self.is_supported_crop(crop):
                return {
                    "prediction_type": "error",
                    "crop": crop,
                    "condition": "Unsupported crop",
                    "confidence": 0.0,
                    "severity": "unknown",
                    "symptoms": [],
                    "recommendations": [
                        "Select one of the supported crops."
                    ],
                    "explainability_image_url": None,
                    "model_version": MODEL_VERSION,
                    "status": "error",
                }

            normalized_crop = normalize_crop_name(crop)

            # ------------------------------------------------
            # Validate image
            # ------------------------------------------------

            if not image_bytes:
                return {
                    "prediction_type": "error",
                    "crop": crop,
                    "condition": "No image provided",
                    "confidence": 0.0,
                    "severity": "unknown",
                    "symptoms": [],
                    "recommendations": [
                        "Please upload a crop image."
                    ],
                    "explainability_image_url": None,
                    "model_version": MODEL_VERSION,
                    "status": "error",
                }

            # ------------------------------------------------
            # Preprocess
            # ------------------------------------------------

            original_pil = Image.open(io.BytesIO(image_bytes))
            image_array = self.preprocess_image(image_bytes)

            # ------------------------------------------------
            # Model inference
            # ------------------------------------------------

            predictions = self.model.predict(
                image_array,
                verbose=0,
            )

            # First image in batch
            probabilities = predictions[0]

            # ------------------------------------------------
            # Get top prediction
            # ------------------------------------------------

            class_index = int(np.argmax(probabilities))

            confidence = float(probabilities[class_index])

            class_name = self.class_names.get(
                class_index,
                "Unknown",
            )

            # ------------------------------------------------
            # Get predicted crop
            # ------------------------------------------------

            predicted_crop = get_crop_from_class(class_name)

            # ------------------------------------------------
            # Confidence check
            # ------------------------------------------------

            if confidence < CONFIDENCE_THRESHOLD:
                return uncertain_response(
                    normalized_crop,
                    confidence,
                )

            # ------------------------------------------------
            # Crop mismatch check
            # ------------------------------------------------

            if predicted_crop != normalized_crop:

                return {
                    "prediction_type": "uncertain",
                    "crop": crop,
                    "condition": "Image may not match selected crop",
                    "confidence": round(confidence, 4),
                    "severity": "unknown",
                    "symptoms": [
                        "The model detected a different crop than the selected crop."
                    ],
                    "recommendations": [
                        "Make sure the selected crop matches the uploaded image.",
                        "Upload a clear image of the selected crop.",
                    ],
                    "explainability_image_url": None,
                    "model_version": MODEL_VERSION,
                    "status": "ok",
                }

            # ------------------------------------------------
            # Determine prediction type
            # ------------------------------------------------

            prediction_type = get_prediction_type(class_name)

            # ------------------------------------------------
            # Respect requested analysis type
            # ------------------------------------------------

            if analysis_type == "disease":
                if prediction_type == "pest":
                    return uncertain_response(
                        normalized_crop,
                        confidence,
                    )

            elif analysis_type == "pest":
                if prediction_type != "pest":
                    return uncertain_response(
                        normalized_crop,
                        confidence,
                    )

            # "both" accepts disease, pest and healthy

            # ------------------------------------------------
            # Healthy crop
            # ------------------------------------------------

            if prediction_type == "healthy":

                explainability_url = self.gradcam.explain(
                    original_pil=original_pil,
                    image_array=image_array,
                    target_class_index=class_index,
                )

                return {
                    "prediction_type": "healthy",
                    "crop": normalized_crop,
                    "condition": "Healthy",
                    "confidence": round(confidence, 4),
                    "severity": "none",
                    "symptoms": get_symptoms(
                        "Healthy",
                        "healthy",
                    ),
                    "recommendations": get_recommendations(
                        "Healthy",
                        "healthy",
                    ),
                    "explainability_image_url": explainability_url,
                    "model_version": MODEL_VERSION,
                    "status": "ok",
                }

            # ------------------------------------------------
            # Disease / Pest result
            # ------------------------------------------------

            condition = get_condition_name(class_name)

            severity = estimate_severity(confidence)

            symptoms = get_symptoms(
                condition,
                prediction_type,
            )

            recommendations = get_recommendations(
                condition,
                prediction_type,
            )

            explainability_url = self.gradcam.explain(
                original_pil=original_pil,
                image_array=image_array,
                target_class_index=class_index,
            )

            # ------------------------------------------------
            # Standardized response
            # ------------------------------------------------

            return {
                "prediction_type": prediction_type,
                "crop": normalized_crop,
                "condition": condition,
                "confidence": round(confidence, 4),
                "severity": severity,
                "symptoms": symptoms,
                "recommendations": recommendations,
                "explainability_image_url": explainability_url,
                "model_version": MODEL_VERSION,
                "status": "ok",
            }

        except Exception as e:

            # Log server-side for debugging
            print("Prediction error:", repr(e))

            # Do NOT expose raw exception to frontend
            return {
                "prediction_type": "error",
                "crop": crop,
                "condition": "Analysis failed",
                "confidence": 0.0,
                "severity": "unknown",
                "symptoms": [],
                "recommendations": [
                    "Please try uploading the image again.",
                    "If the problem continues, try a different image.",
                ],
                "explainability_image_url": None,
                "model_version": MODEL_VERSION,
                "status": "error",
            }


# ============================================================
# SINGLETON
# ============================================================

prediction_service = PredictionService()