"""Public demo server: serves the web page and answers a few doubts about one sample lecture with canned replies.

The real answering service is private. This stub only shows the student experience: the answer streams in, and
every point links to the moment in the lecture it comes from.

    uvicorn server.app:app --port 8000      (from the repository root)
"""
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
LECTURE = json.loads((ROOT / "sample_lecture.json").read_text())

app = FastAPI(title="Lecture Doubt Solver (public demo)")


@app.get("/api/health")
def health():
    return {"ok": True, "mode": "demo"}


app.mount("/", StaticFiles(directory=ROOT.parent / "web", html=True), name="web")
