import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
from pathlib import Path
from PIL import Image
import io

from services.prediction_service import prediction_service

POTATO_IMAGE = r"C:\Users\LOQ\OneDrive\Pictures\Screenshots\Screenshot 2026-09-06 135534.png"

print("--- Testing Potato Early Blight Image ---")
with open(POTATO_IMAGE, "rb") as f:
    potato_bytes = f.read()

res_potato = prediction_service.predict(
    image_bytes=potato_bytes,
    crop="potato",
    analysis_type="disease"
)

print("Potato Prediction Result:")
for k, v in res_potato.items():
    print(f"  {k}: {v}")

assert res_potato["prediction_type"] == "disease", f"Expected disease, got {res_potato['prediction_type']}"
assert res_potato["condition"] == "Early Blight", f"Expected Early Blight, got {res_potato['condition']}"
assert abs(res_potato["confidence"] - 0.9683) < 0.01, f"Expected ~0.9683, got {res_potato['confidence']}"
assert res_potato["severity"] == "high", f"Expected high, got {res_potato['severity']}"
assert res_potato["status"] == "ok", f"Expected ok, got {res_potato['status']}"
assert res_potato["explainability_image_url"] is not None, "Expected explainability_image_url to not be None"
assert res_potato["explainability_image_url"].startswith("/static/explainability/gradcam_"), f"Unexpected URL: {res_potato['explainability_image_url']}"

# Check generated file on disk
rel_path = res_potato["explainability_image_url"].lstrip("/")
full_file_path = Path(__file__).resolve().parent / rel_path
print(f"Checking generated file: {full_file_path}")
assert full_file_path.exists(), f"File does not exist: {full_file_path}"
assert full_file_path.stat().st_size > 1000, f"File size too small: {full_file_path.stat().st_size}"
print("Generated file verified, size:", full_file_path.stat().st_size, "bytes")

print("\n--- Testing Uncertain / Crop Mismatch Image ---")
# Uploading potato leaf but asking for tomato
res_mismatch = prediction_service.predict(
    image_bytes=potato_bytes,
    crop="tomato",
    analysis_type="disease"
)
print("Mismatch Prediction Result:")
for k, v in res_mismatch.items():
    print(f"  {k}: {v}")

assert res_mismatch["prediction_type"] == "uncertain"
assert res_mismatch["explainability_image_url"] is None, "Expected explainability_image_url to be None for uncertain"

print("\n--- All Backend Assertions Passed Successfully! ---")
