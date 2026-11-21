// Public demo page: show the sample lecture's transcript, ask a doubt, stream the answer, and turn each
// citation into a chip that jumps to that moment in the transcript.
(function () {
  "use strict";
  var transcript = document.getElementById("transcript");
  var answers = document.getElementById("answers");
  var form = document.getElementById("ask-form");
  var question = document.getElementById("question");
  var button = document.getElementById("ask-button");

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
        var time = document.createElement("time");
        time.textContent = mmss(line.t);
        var text = document.createElement("span");
        text.textContent = line.text;
        li.append(time, text);
        transcript.append(li);
      });
    });
  }

  loadLecture();
})();
