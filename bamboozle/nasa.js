// ===== Konfiguration =====
const CONFIG = {
  countdownSeconds: 15,
  correctionsNeeded: 5, // så många lyckade klick på "Ändra kurs" för att rädda valpen
  dodgeChance: 0.6, // risk att knappen flyr när muspekaren närmar sig
  correctionStep: 7, // % uppåt per kurskorrigering
  secretClicksToWin: 3,
  volume: 0.8,
  minDodgeDistance: 50, // px mellan muspekaren och knappens nya position
  dodgeCheckInterval: 100, // ms mellan nya flykt-försök medan musen är över knappen
};

const LOG_ENTRIES = {
  20: "Uppskjutning bekräftad. Valpen sitter i förarsätet.",
  17: "Valpen har hittat tutan.",
  14: "Autopiloten har ersatts av en tuggleksak.",
  11: "Satellit KRONOS-7 svarar inte på skäll.",
  8: "Valpen vägrar ta på sig säkerhetsbältet.",
  5: "Kollision trolig. Ring mamma.",
  3: "Valpen viftar på svansen. Ingen vet varför.",
};

const MOODS = ["Glad", "Nyfiken", "Lite orolig", "Skäller", "Panik"];

const scene = document.getElementById("scene");
const car = document.getElementById("car");
const satellite = document.getElementById("satellite");
const boom = document.getElementById("boom");
const controls = document.getElementById("controls");
const steerButton = document.getElementById("steer-button");
const countdownEl = document.getElementById("countdown");
const distanceEl = document.getElementById("distance");
const correctionsEl = document.getElementById("corrections");
const moodEl = document.getElementById("mood");
const logEl = document.getElementById("log");
const resultEl = document.getElementById("result");
const title = document.getElementById("title");

document.getElementById("corrections-needed").textContent = CONFIG.correctionsNeeded;

const START_X = 2; // % från vänster
const TARGET_X = 74; // där bilen träffar satelliten
const COURSE_Y = 42; // % från toppen

let startTime = null;
let timeLeft = CONFIG.countdownSeconds;
let corrections = 0;
let gameOver = false;
let frameId = null;

const goatSound = new Audio("freesound_community-man-shout-like-a-goat-105005.mp3");

function playGoat() {
  const goat = goatSound.cloneNode();
  goat.volume = CONFIG.volume;
  goat.play().catch(() => {}); // webbläsaren kan blockera ljud utan klick
}

function addLog(text) {
  const item = document.createElement("li");
  const stamp = `T−${String(timeLeft).padStart(2, "0")}`;
  item.innerHTML = `<time>${stamp}</time> ${text}`;
  logEl.prepend(item);
}

// ===== Spelflöde =====
function frame(now) {
  if (gameOver) return;
  if (startTime === null) startTime = now;

  const elapsed = (now - startTime) / 1000;
  const progress = Math.min(elapsed / CONFIG.countdownSeconds, 1);

  car.style.left = `${START_X + progress * (TARGET_X - START_X)}%`;
  distanceEl.textContent = Math.round((1 - progress) * 4200);
  moodEl.textContent = MOODS[Math.min(Math.floor(progress * MOODS.length), MOODS.length - 1)];

  const secondsLeft = Math.ceil(CONFIG.countdownSeconds - elapsed);
  if (secondsLeft !== timeLeft) {
    timeLeft = Math.max(secondsLeft, 0);
    countdownEl.textContent = timeLeft;
    if (LOG_ENTRIES[timeLeft]) addLog(LOG_ENTRIES[timeLeft]);
  }

  if (progress >= 1) {
    crash();
    return;
  }
  frameId = requestAnimationFrame(frame);
}

function updateCourse() {
  car.style.top = `${COURSE_Y - corrections * CONFIG.correctionStep}%`;
}

function crash() {
  gameOver = true;
  car.hidden = true;
  satellite.hidden = true;
  boom.hidden = false;
  playGoat();
  addLog("Kontakt med satelliten förlorad. Och med valpen.");
  setTimeout(() => endGame(false), 1200);
}

function escape() {
  gameOver = true;
  cancelAnimationFrame(frameId);
  addLog("Kursändring lyckad! Valpen susar förbi satelliten.");
  car.classList.add("car--escape");
  setTimeout(() => endGame(true), 1400);
}

function endGame(won) {
  gameOver = true;
  cancelAnimationFrame(frameId);
  resultEl.hidden = false;
  resultEl.innerHTML = won
    ? `🎉 Valpen är räddad! 🐶🚀<br><a href="index.html">Spela igen</a>`
    : `💥 Krasch!<br><small>Valpen och satelliten är nu ett.</small><br><a href="index.html">Försök igen</a>`;
}

// ===== Knappen som inte vill bli klickad =====
// Avstånd från en punkt till närmaste kant av en rektangel (0 om punkten är inuti)
function distanceToRect(x, y, rect) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

function dodge(event) {
  if (gameOver || Math.random() > CONFIG.dodgeChance) return;

  const area = controls.getBoundingClientRect();
  const width = steerButton.offsetWidth;
  const height = steerButton.offsetHeight;
  const maxX = area.width - width;
  const maxY = area.height - height;

  let best = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    const rect = {
      left: area.left + x,
      top: area.top + y,
      right: area.left + x + width,
      bottom: area.top + y + height,
    };
    const distance = distanceToRect(event.clientX, event.clientY, rect);

    if (!best || distance > best.distance) best = { x, y, distance };
    if (distance >= CONFIG.minDodgeDistance) break;
  }

  steerButton.style.left = `${best.x}px`;
  steerButton.style.top = `${best.y}px`;
}

let hoverTimer = null;
let pointer = { clientX: 0, clientY: 0 };

function startHoverCheck(event) {
  pointer = { clientX: event.clientX, clientY: event.clientY };
  stopHoverCheck();
  dodge(pointer);
  if (!gameOver) hoverTimer = setInterval(() => dodge(pointer), CONFIG.dodgeCheckInterval);
}

function stopHoverCheck() {
  clearInterval(hoverTimer);
  hoverTimer = null;
}

steerButton.addEventListener("pointerenter", startHoverCheck);
steerButton.addEventListener("pointermove", (event) => {
  pointer = { clientX: event.clientX, clientY: event.clientY };
});
steerButton.addEventListener("pointerleave", stopHoverCheck);

steerButton.addEventListener("click", () => {
  if (gameOver) return;
  corrections++;
  correctionsEl.textContent = corrections;
  updateCourse();
  if (corrections >= CONFIG.correctionsNeeded) escape();
  else addLog(`Kurskorrigering ${corrections} av ${CONFIG.correctionsNeeded} genomförd.`);
});

title.addEventListener("click", (event) => {
  if (event.detail === CONFIG.secretClicksToWin && !gameOver) escape();
});

// ===== Start =====
updateCourse();
addLog(LOG_ENTRIES[20]);
frameId = requestAnimationFrame(frame);