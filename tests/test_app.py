import os

os.environ.setdefault("DEMO_WORD_DELAY", "0")

from fastapi.testclient import TestClient  # noqa: E402

from server.app import app, canned_reply  # noqa: E402

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"ok": True, "mode": "demo"}


def test_lecture_has_a_timed_transcript():
    lec = client.get("/api/lecture").json()
    times = [line["t"] for line in lec["transcript"]]
    assert lec["title"] and times == sorted(times)


def test_known_doubt_streams_an_answer_with_citations():
    body = client.post("/api/ask", json={"question": "binary search yahan kyun lag sakti hai?"}).text
    assert "event: delta" in body and "event: cite" in body and body.rstrip().endswith("data: {}")


def test_unknown_doubt_says_the_lecture_does_not_cover_it():
    assert "nahi hai" in canned_reply("what is a segment tree?")["parts"][0]["text"]


def test_empty_question_is_rejected():
    assert client.post("/api/ask", json={"question": ""}).status_code == 422


def test_page_is_served():
    assert "Ask a doubt" in client.get("/").text
