/* Flashcards: flip through the deck, or learn it by typing each answer until every card is right. */
(function () {
  "use strict";

  const root = document.getElementById("cards");
  if (!root) return;

  const CARDS = [
    { topic: "Flowcharts", front: "Flowchart shape for input or output", back: "oval", accept: ["circle", "ellipse"] },
    { topic: "Flowcharts", front: "Flowchart shape for an instruction", back: "rectangle", accept: ["rect", "box"] },
    { topic: "Flowcharts", front: "Flowchart shape for a yes/no question", back: "diamond" },
    { topic: "Flowcharts", front: "Index of the first element of a flowchart list", back: "1", accept: ["one"] },
    { topic: "Flowcharts", front: "Number of arrows out of a diamond", back: "2", accept: ["two"] },

    { topic: "Java files", front: "The class inside Average.java must be named", back: "Average" },
    { topic: "Java files", front: "Signature of the main method", back: "public static void main(String[] args)" },
    { topic: "Java files", front: "Command to compile X.java", back: "javac X.java" },
    { topic: "Java files", front: "Command to run the compiled class X", back: "java X" },
    { topic: "Java files", front: "Every method in this course starts with", back: "public static" },

    { topic: "Types", front: "Number of bits in an int", back: "32" },
    { topic: "Types", front: "Number of bits in a double", back: "64" },
    { topic: "Types", front: "Largest int, as a Java constant", back: "Integer.MAX_VALUE" },
    { topic: "Types", front: "Integer.MAX_VALUE + 1", back: "Integer.MIN_VALUE", accept: ["-2147483648"] },
    { topic: "Types", front: "Letter at the end of a float literal", back: "F" },
    { topic: "Types", front: "Value of d after: double d = 7 / 2;", back: "3.0" },
    { topic: "Types", front: "(int) -3.8", back: "-3" },
    { topic: "Types", front: "Type of the condition in an if or while", back: "boolean" },

    { topic: "Arithmetic", front: "17 / 4", back: "4" },
    { topic: "Arithmetic", front: "17 % 4", back: "1" },
    { topic: "Arithmetic", front: "-7 / 2", back: "-3" },
    { topic: "Arithmetic", front: "-7 % 2", back: "-1" },
    { topic: "Arithmetic", front: "7 / 2.0", back: "3.5" },
    { topic: "Arithmetic", front: "1 + 2 + \"3\"", back: "\"33\"", accept: ["33"] },
    { topic: "Arithmetic", front: "\"1\" + 2 + 3", back: "\"123\"", accept: ["123"] },
    { topic: "Arithmetic", front: "Operators that run before + and -", back: "* / %", accept: ["*/%", "*, /, %", "* / and %"] },
    { topic: "Arithmetic", front: "Last digit of n (n >= 0)", back: "n % 10" },
    { topic: "Arithmetic", front: "n with its last digit removed (n >= 0)", back: "n / 10" },
    { topic: "Arithmetic", front: "Test that n is divisible by d", back: "n % d == 0" },

    { topic: "Booleans", front: "In a && b, b is skipped when a is", back: "false" },
    { topic: "Booleans", front: "In a || b, b is skipped when a is", back: "true" },
    { topic: "Booleans", front: "Operator that tests whether two ints are equal", back: "==" },
    { topic: "Booleans", front: "Operator that tests whether two ints are not equal", back: "!=" },

    { topic: "Control flow", front: "Fewest times a while body can run", back: "0", accept: ["zero"] },
    { topic: "Control flow", front: "Fewest times a do-while body can run", back: "1", accept: ["one"] },
    { topic: "Control flow", front: "The three parts of a for header, in order", back: "initialization; condition; update", accept: ["initialization, condition, update", "init; condition; update", "init, condition, update"] },
    { topic: "Control flow", front: "Statement that leaves a loop immediately", back: "break" },
    { topic: "Control flow", front: "Statement that skips to the next check of the loop condition", back: "continue" },
    { topic: "Control flow", front: "Statement that leaves the whole method", back: "return" },
    { topic: "Control flow", front: "In if / else if / else, how many branches run?", back: "1", accept: ["one", "only one", "at most one"] },

    { topic: "Correctness", front: "An algorithm is correct if, for every input, it", back: "halts with the correct output", accept: ["stops with the correct output", "halts with the right output", "stops with the right output"] },
    { topic: "Correctness", front: "Property that holds before a loop and after every pass", back: "loop invariant", accept: ["invariant"] },
    { topic: "Correctness", front: "Positive quantity that gets smaller every pass", back: "termination measure" },

    { topic: "Algorithms", front: "Binary search needs the list to be", back: "sorted" },
    { topic: "Algorithms", front: "Binary search: mid =", back: "floor((lo + hi) / 2)", accept: ["(lo + hi) / 2 rounded down", "⌊(lo + hi) / 2⌋"] },
    { topic: "Algorithms", front: "Selection sort puts which element into position i?", back: "smallest remaining", accept: ["smallest", "minimum", "the smallest", "smallest of the rest", "min"] }
  ];

  const topics = ["All topics"].concat(CARDS.map((c) => c.topic).filter((t, i, a) => a.indexOf(t) === i));
  const $ = (sel) => root.querySelector(sel);

  const topicSel = $("[data-topic]");
  topics.forEach((t) => {
    const o = document.createElement("option");
    o.textContent = t;
    topicSel.append(o);
  });

  function deck() {
    const t = topicSel.value;
    return CARDS.filter((c) => t === "All topics" || c.topic === t);
  }

  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  function norm(s) {
    return s.toLowerCase()
      .replace(/[“”]/g, "\"").replace(/[‘’]/g, "'")
      .trim()
      .replace(/^(the|a|an)\s+/, "")
      .replace(/[.;]+$/, "")
      .replace(/\s+/g, "");
  }

  function matches(card, typed) {
    const t = norm(typed);
    return t.length > 0 && [card.back].concat(card.accept || []).some((a) => norm(a) === t);
  }

  /* ---------- mode tabs ---------- */

  const tabs = root.querySelectorAll("[data-mode]");
  tabs.forEach((b) => b.addEventListener("click", () => setMode(b.getAttribute("data-mode"))));

  function setMode(mode) {
    tabs.forEach((b) => b.classList.toggle("on", b.getAttribute("data-mode") === mode));
    $(".fc-flip").hidden = mode !== "flip";
    $(".fc-learn").hidden = mode !== "learn";
    if (mode === "learn") startLearn();
    else startFlip();
  }

  topicSel.addEventListener("change", () => {
    if (!$(".fc-learn").hidden) startLearn();
    else startFlip();
  });

  /* ---------- flip ---------- */

  const card = $(".fc-card");
  let flip = { cards: [], i: 0, back: false };

  function startFlip(shuffled) {
    flip = { cards: shuffled ? shuffle(deck()) : deck(), i: 0, back: false };
    showFlip();
  }

  function showFlip() {
    const c = flip.cards[flip.i];
    card.classList.toggle("back", flip.back);
    $(".fc-front-text").textContent = c.front;
    $(".fc-back-text").textContent = c.back;
    $(".fc-side").textContent = flip.back ? "Answer" : c.topic;
    $(".fc-count").textContent = (flip.i + 1) + " / " + flip.cards.length;
  }

  function move(d) {
    flip.i = (flip.i + d + flip.cards.length) % flip.cards.length;
    flip.back = false;
    showFlip();
  }

  card.addEventListener("click", () => { flip.back = !flip.back; showFlip(); });
  card.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
  });
  $("[data-prev]").addEventListener("click", () => move(-1));
  $("[data-next]").addEventListener("click", () => move(1));
  $("[data-shuffle]").addEventListener("click", () => startFlip(true));

  /* ---------- learn ---------- */

  const prompt = $(".fc-prompt");
  const answer = $(".fc-answer");
  const feedback = $(".fc-feedback");
  const overrideBtn = $("[data-override]");
  let learn = null;

  function startLearn() {
    learn = { queue: shuffle(deck()), total: deck().length, learned: 0, misses: 0, copying: false, wrongTyped: "" };
    $(".fc-done").hidden = true;
    $(".fc-quiz").hidden = false;
    showLearn();
  }

  function showLearn() {
    const pct = learn.total ? Math.round(100 * learn.learned / learn.total) : 0;
    $(".fc-bar span").style.width = pct + "%";
    $(".fc-progress-text").textContent = learn.learned + " of " + learn.total + " learned";
    if (!learn.queue.length) {
      $(".fc-quiz").hidden = true;
      $(".fc-done").hidden = false;
      $(".fc-done-text").textContent = "You wrote all " + learn.total + " cards correctly" +
        (learn.misses ? ", with " + learn.misses + " " + (learn.misses === 1 ? "miss" : "misses") + " along the way." : " with no misses.");
      return;
    }
    const c = learn.queue[0];
    prompt.textContent = c.front;
    answer.value = "";
    if (learn.copying) {
      feedback.className = "fc-feedback wrong";
      feedback.innerHTML = "";
      const line1 = document.createElement("div");
      line1.append("Not quite. You wrote: ");
      const yours = document.createElement("code");
      yours.textContent = learn.wrongTyped;
      line1.append(yours);
      const line2 = document.createElement("div");
      line2.append("Correct answer: ");
      const right = document.createElement("code");
      right.textContent = c.back;
      line2.append(right);
      const line3 = document.createElement("div");
      line3.className = "fc-copy-note";
      line3.textContent = "Type the correct answer to continue. This card will come back.";
      feedback.append(line1, line2, line3);
      answer.placeholder = "Copy the correct answer";
      overrideBtn.hidden = false;
    } else {
      feedback.className = "fc-feedback";
      feedback.textContent = "";
      answer.placeholder = "Type your answer and press Enter";
      overrideBtn.hidden = true;
    }
    answer.focus({ preventScroll: true });
  }

  function check() {
    if (!learn || !learn.queue.length) return;
    const c = learn.queue[0];
    const typed = answer.value;
    if (!typed.trim()) return;
    if (learn.copying) {
      if (matches(c, typed)) {
        learn.copying = false;
        requeue();
        showLearn();
      } else {
        answer.classList.add("shake");
        setTimeout(() => answer.classList.remove("shake"), 300);
      }
      return;
    }
    if (matches(c, typed)) {
      learn.queue.shift();
      learn.learned++;
      showLearn();
      flash();
    } else {
      learn.misses++;
      learn.copying = true;
      learn.wrongTyped = typed;
      showLearn();
    }
  }

  function requeue() {
    const c = learn.queue.shift();
    const spot = Math.min(learn.queue.length, 3);
    learn.queue.splice(spot, 0, c);
  }

  function flash() {
    feedback.className = "fc-feedback right";
    feedback.textContent = "Correct";
    setTimeout(() => { if (feedback.textContent === "Correct") { feedback.textContent = ""; feedback.className = "fc-feedback"; } }, 900);
  }

  answer.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); check(); }
  });
  $("[data-check]").addEventListener("click", check);
  overrideBtn.addEventListener("click", () => {
    if (!learn.copying) return;
    learn.misses--;
    learn.copying = false;
    learn.queue.shift();
    learn.learned++;
    showLearn();
  });
  $("[data-restart]").addEventListener("click", startLearn);
  $("[data-again]").addEventListener("click", startLearn);

  setMode("flip");
})();
