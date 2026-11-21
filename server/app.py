"""Public demo server: serves the web page and answers a few doubts about one sample lecture with canned replies.

The real answering service is private. This stub only shows the student experience: the answer streams in, and
every point links to the moment in the lecture it comes from.

    uvicorn server.app:app --port 8000      (from the repository root)
"""
import asyncio
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
LECTURE = json.loads((ROOT / "sample_lecture.json").read_text())
WORD_DELAY_S = 0.03

app = FastAPI(title="Lecture Doubt Solver (public demo)")


@app.get("/api/health")
def health():
    return {"ok": True, "mode": "demo"}


@app.get("/api/lecture")
def lecture():
    return {"title": LECTURE["title"], "note": LECTURE["note"], "transcript": LECTURE["transcript"]}


class Doubt(BaseModel):
    question: str = Field(min_length=1, max_length=600)
    t: float = 0


def canned_reply(question: str) -> dict:
    """The first sample answer whose keywords appear in the question, else the fallback."""
    q = question.lower()
    return next((a for a in LECTURE["sample_answers"] if any(k in q for k in a["keywords"])), LECTURE["fallback"])


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/ask")
async def ask(doubt: Doubt):
    reply = canned_reply(doubt.question)

    async def stream():
        for i, part in enumerate(reply["parts"]):
            for word in part["text"].split(" "):
                yield sse("delta", {"part": i, "text": word + " "})
                await asyncio.sleep(WORD_DELAY_S)
            if part.get("at") is not None:
                yield sse("cite", {"part": i, "t": part["at"]})
        yield sse("done", {})

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


app.mount("/", StaticFiles(directory=ROOT.parent / "web", html=True), name="web")
