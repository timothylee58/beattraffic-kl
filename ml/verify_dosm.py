"""Verify that the daily model and metrics in this checkout belong to the same run."""
import hashlib
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort

directory = Path(__file__).resolve().parent / "models"
model = directory / "crowd_model_v1_dosm.onnx"
metrics = json.loads((directory / "metrics_v1_dosm.json").read_text())
if hashlib.sha256(model.read_bytes()).hexdigest() != metrics["model_sha256"]:
    raise ValueError("Daily model checksum differs from its evaluation report")

session = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
sample = np.array([[0, 0, 1, 0, 0, 1, 2, 10000, 12000, 11500]], dtype=np.float32)
prediction = session.run(None, {session.get_inputs()[0].name: sample})[0]
if prediction.size != 1 or not np.isfinite(prediction).all():
    raise ValueError("Daily model failed its inference check")
print(f"Verified daily model with {metrics['test_rows']} evaluated station-days")
