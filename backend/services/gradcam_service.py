import os
import time
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
import tensorflow as tf
from PIL import Image

# ============================================================
# CONFIG & PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
EXPLAINABILITY_DIR = STATIC_DIR / "explainability"
EXPLAINABILITY_DIR.mkdir(parents=True, exist_ok=True)

# URL prefix under FastAPI
EXPLAINABILITY_URL_PREFIX = "/static/explainability"

# File retention parameters
MAX_FILE_AGE_SECONDS = 7200  # 2 hours
MAX_RETAINED_FILES = 100


# ============================================================
# COLORMAP HELPER (Pure NumPy Jet Colormap)
# ============================================================

def apply_jet_colormap(heatmap_2d: np.ndarray) -> np.ndarray:
    """
    Maps a 2D float array with values in [0, 1] to an RGB uint8 array (H, W, 3)
    using the standard Jet colormap.
    """
    x = np.clip(heatmap_2d, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * x - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * x - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * x - 1.0), 0.0, 1.0)
    rgb = np.stack([r, g, b], axis=-1)
    return (rgb * 255.0).astype(np.uint8)


# ============================================================
# STORAGE CLEANUP
# ============================================================

def cleanup_stale_images(directory: Path = EXPLAINABILITY_DIR) -> None:
    """
    Removes generated visualization files older than MAX_FILE_AGE_SECONDS
    or truncates directory to MAX_RETAINED_FILES to prevent accumulation.
    """
    try:
        now = time.time()
        files = list(directory.glob("gradcam_*.jpg"))

        # 1. Delete files older than threshold
        for f in files:
            try:
                if now - f.stat().st_mtime > MAX_FILE_AGE_SECONDS:
                    f.unlink(missing_ok=True)
            except OSError:
                pass

        # 2. Limit total count to MAX_RETAINED_FILES
        remaining = sorted(directory.glob("gradcam_*.jpg"), key=lambda p: p.stat().st_mtime)
        if len(remaining) > MAX_RETAINED_FILES:
            excess = remaining[: len(remaining) - MAX_RETAINED_FILES]
            for f in excess:
                try:
                    f.unlink(missing_ok=True)
                except OSError:
                    pass
    except Exception as exc:
        # Retention cleanup failure should not fail inference
        print(f"[GradCAM] Cleanup warning: {exc}")


# ============================================================
# GRAD-CAM SERVICE
# ============================================================

class GradCAMService:
    """
    Computes genuine Grad-CAM heatmaps for the CropCare EfficientNetB0 model
    using TensorFlow GradientTape.
    """

    def __init__(self, full_model: tf.keras.Model, target_layer_name: str = "top_activation"):
        self.full_model = full_model
        self.target_layer_name = target_layer_name
        self.aug_layer = full_model.get_layer("augmentation")

        # Resolve nested EfficientNetB0 submodel
        self.eff_model = full_model.get_layer("efficientnetb0")
        self.target_layer = self.eff_model.get_layer(target_layer_name)

        print(
            f"[GradCAM] Target layer verified: '{self.target_layer_name}' "
            f"with output shape {self.target_layer.output.shape}"
        )

        # 1. Efficient submodel returning target conv activations
        self.eff_submodel = tf.keras.Model(
            inputs=self.eff_model.inputs,
            outputs=[self.target_layer.output, self.eff_model.output],
            name="gradcam_eff_submodel",
        )

        # 2. Classifier model mapping from target conv activations to final logits
        classifier_input = tf.keras.Input(
            shape=self.target_layer.output.shape[1:],
            name="gradcam_classifier_input",
        )
        x = self.eff_model.get_layer("avg_pool")(classifier_input)
        for layer_name in ["dropout", "dense", "dropout_1", "dense_1"]:
            x = self.full_model.get_layer(layer_name)(x)

        self.classifier_model = tf.keras.Model(
            inputs=classifier_input,
            outputs=x,
            name="gradcam_classifier_model",
        )

        # Initial storage cleanup
        cleanup_stale_images()

    def generate_gradcam_heatmap(
        self,
        image_array: np.ndarray,
        target_class_index: int,
    ) -> np.ndarray:
        """
        Computes normalized 2D Grad-CAM heatmap [0, 1] for the specified class index.
        """
        # Run through augmentation in inference mode (training=False)
        aug_out = self.aug_layer(image_array, training=False)

        with tf.GradientTape() as tape:
            # Forward through feature extractor
            conv_outputs = self.eff_submodel(aug_out, training=False)[0]
            tape.watch(conv_outputs)

            # Forward through classification head
            preds = self.classifier_model(conv_outputs, training=False)
            loss = preds[:, target_class_index]

        # Compute gradient of target class score with respect to feature maps
        grads = tape.gradient(loss, conv_outputs)

        # Global average pooling of gradients (importance weights alpha_k)
        weights = tf.reduce_mean(grads, axis=(1, 2))  # shape: (1, channels)

        # Weighted combination of feature maps
        cam = tf.reduce_sum(
            tf.multiply(weights[:, tf.newaxis, tf.newaxis, :], conv_outputs),
            axis=-1,
        )

        # ReLU to keep only features that have a positive influence
        cam = tf.nn.relu(cam)[0].numpy()

        # Normalize to [0, 1]
        cam_max = float(cam.max())
        cam_min = float(cam.min())
        if cam_max > cam_min:
            cam = (cam - cam_min) / (cam_max - cam_min + 1e-8)
        else:
            cam = np.zeros_like(cam)

        return cam

    def overlay_and_save(
        self,
        original_pil: Image.Image,
        heatmap_2d: np.ndarray,
        alpha: float = 0.45,
    ) -> str:
        """
        Resizes heatmap to the original image dimensions, applies Jet colormap,
        blends with the original image, and saves to static storage.
        Returns the API-accessible URL path.
        """
        orig_w, orig_h = original_pil.size

        # 1. Resize heatmap to original image dimensions using bicubic interpolation
        cam_uint8 = (np.clip(heatmap_2d, 0.0, 1.0) * 255.0).astype(np.uint8)
        cam_img = Image.fromarray(cam_uint8, mode="L")
        cam_resized = cam_img.resize((orig_w, orig_h), resample=Image.Resampling.BICUBIC)

        # 2. Colorize with Jet colormap
        cam_norm = np.asarray(cam_resized, dtype=np.float32) / 255.0
        heatmap_rgb = apply_jet_colormap(cam_norm)
        heatmap_pil = Image.fromarray(heatmap_rgb, mode="RGB")

        # 3. Blend original image with heatmap
        base_rgb = original_pil.convert("RGB")
        blended = Image.blend(base_rgb, heatmap_pil, alpha=alpha)

        # 4. Generate unique filename and save safely
        filename = f"gradcam_{uuid.uuid4().hex[:12]}_{int(time.time())}.jpg"
        file_path = EXPLAINABILITY_DIR / filename
        blended.save(file_path, format="JPEG", quality=90, optimize=True)

        # Periodic cleanup of old visualizations
        cleanup_stale_images()

        return f"{EXPLAINABILITY_URL_PREFIX}/{filename}"

    def explain(
        self,
        original_pil: Image.Image,
        image_array: np.ndarray,
        target_class_index: int,
    ) -> Optional[str]:
        """
        End-to-end explainability generation. Returns URL path or None on failure.
        """
        try:
            heatmap = self.generate_gradcam_heatmap(image_array, target_class_index)
            url = self.overlay_and_save(original_pil, heatmap)
            return url
        except Exception as exc:
            print(f"[GradCAM] Explanation generation error: {exc}")
            return None
