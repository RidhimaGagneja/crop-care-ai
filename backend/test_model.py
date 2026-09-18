import tensorflow as tf
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "models" / "cropcare_model.keras"

print("Loading model...")

model = tf.keras.models.load_model(MODEL_PATH)

print("Model loaded successfully!")
print("Input shape:", model.input_shape)
print("Output shape:", model.output_shape)