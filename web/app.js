// Public demo page: show the sample lecture's transcript, ask a doubt, stream the answer, and turn each
// citation into a chip that jumps to that moment in the transcript.
(function () {
  "use strict";
  var transcript = document.getElementById("transcript");
  var answers = document.getElementById("answers");
  var form = document.getElementById("ask-form");
  var question = document.getElementById("question");
  var button = document.getElementById("ask-button");
  var paused = document.getElementById("paused");
  var pausedAt = 0;
  var SUGGESTIONS = ["binary search yahan kyun lag sakti hai?", "low aur high kya hain?",
                     "possible function kaise check karta hai?", "overflow kaise avoid karein?"];

  // Example doubts, shown until the first one is asked.
  function showSuggestions() {
    var box = document.createElement("div");
    box.className = "suggestions";
    SUGGESTIONS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = s;
      b.onclick = function () { question.value = s; form.requestSubmit(); };
      box.append(b);
    });
    answers.append(box);
  }

  // Clicking a transcript line stands in for pausing the video there; the doubt is sent with that moment.
  function pauseAt(li) {
    Array.prototype.forEach.call(transcript.children, function (x) { x.classList.toggle("paused-here", x === li); });
    pausedAt = Number(li.dataset.t);
    paused.hidden = false;
    paused.textContent = "Paused at " + mmss(pausedAt) + ". Your doubt will be about this moment.";
    question.focus();
  }

  function mmss(t) {
    t = Math.floor(t);
    return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  }

  function loadLecture() {
    return fetch("/api/lecture").then(function (r) { return r.json(); }).then(function (lec) {
      document.getElementById("lecture-title").textContent = lec.title;
      document.getElementById("lecture-note").textContent = lec.note;
      lec.transcript.forEach(function (line) {
        var li = document.createElement("li");
        li.dataset.t = line.t;
        li.tabIndex = 0;
        li.title = "Pause here";
        li.onclick = function () { pauseAt(li); };
        li.onkeydown = function (e) { if (e.key === "Enter") pauseAt(li); };
        var time = document.createElement("time");
        time.textContent = mmss(line.t);
        var text = document.createElement("span");
        text.textContent = line.text;
        li.append(time, text);
        transcript.append(li);
      });
    });
  }

  // Scroll the transcript to the line spoken at time t and highlight it for a moment.
  function jumpTo(t) {
    var lines = Array.prototype.slice.call(transcript.children);
    var line = lines.filter(function (li) { return Number(li.dataset.t) <= t; }).pop() || lines[0];
    if (!line) return;
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    line.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    line.classList.add("hit");
    setTimeout(function () { line.classList.remove("hit"); }, 1600);
  }

  function chip(t) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = "▶ " + mmss(t);
    b.setAttribute("aria-label", "Go to " + mmss(t) + " in the lecture");
    b.onclick = function () { jumpTo(t); };
    return b;
  }

  // Read a text/event-stream response and call onEvent(name, data) for each event.
  function readEvents(response, onEvent) {
    var reader = response.body.getReader(), decoder = new TextDecoder(), buf = "";
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) return;
        buf += decoder.decode(r.value, { stream: true });
        var blocks = buf.split("\n\n");
        buf = blocks.pop();
        blocks.forEach(function (block) {
          var name = "", data = "";
          block.split("\n").forEach(function (line) {
            if (line.indexOf("event: ") === 0) name = line.slice(7);
            else if (line.indexOf("data: ") === 0) data += line.slice(6);
          });
          if (name) onEvent(name, data ? JSON.parse(data) : {});
        });
        return pump();
      });
    }
    return pump();
  }

  function ask(q) {
    var hints = answers.querySelector(".suggestions");
    if (hints) hints.remove();
    var turn = document.createElement("div");
    turn.className = "turn";
    var qEl = document.createElement("div");
    qEl.className = "q";
    qEl.textContent = q;
    var aEl = document.createElement("div");
    aEl.className = "a";
    var waiting = document.createElement("span");
    waiting.className = "waiting";
    waiting.textContent = "thinking…";
    aEl.append(waiting);
    turn.append(qEl, aEl);
    answers.append(turn);
    button.disabled = true;
    return fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" },
                               body: JSON.stringify({ question: q, t: pausedAt }) })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return readEvents(r, function (name, data) {
          waiting.remove();
          if (name === "delta") aEl.append(document.createTextNode(data.text));
          else if (name === "cite") aEl.append(chip(data.t), document.createTextNode(" "));
          turn.scrollIntoView({ block: "end" });   // keep the newest words in view
        });
      })
      .catch(function () { aEl.textContent = "Something went wrong. Please try again."; })
      .then(function () { button.disabled = false; });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = question.value.trim();
    if (!q || button.disabled) return;
    question.value = "";
    ask(q);
  });

  // Enter sends the doubt; Shift+Enter starts a new line.
  question.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  loadLecture();
  showSuggestions();
})();
