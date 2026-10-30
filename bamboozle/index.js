// ===== Konfiguration =====
const CONFIG = {
  countdownSeconds:20,
  popupsPerClose: 4,
  maxPopups: 50,
  secretClicksToWin: 3,
  popupsToSpace: 3, // efter så många stängda popups skickas valpen till rymden
  volume: 0.8, // 0–1, högt som standard
};

const POPUP_MESSAGES = [
  { icon: "⚠️", title: "Viktigt meddelande", text: "Är du SÄKER på att du vill rädda valpen?", yes: "Ja", no: "Nej, jag hatar valpar" },
  { icon: "🍪", title: "Cookies 🍪", text: "Valpen behöver cookies för att överleva. Godkänn alla?", yes: "Godkänn alla", no: "Låt valpen svälta" },
  { icon: "📰", title: "Nyhetsbrev", text: "Prenumerera på Giljotin Weekly för att fortsätta!", yes: "Prenumerera", no: "Jag gillar inte att läsa" },
  { icon: "🔄", title: "Uppdatering", text: "Valp.exe behöver uppdateras (3 av 847 filer).", yes: "Uppdatera nu", no: "Påminn mig om 5 sek" },
  { icon: "📋", title: "Undersökning", text: "Hur nöjd är du med att stänga popups?", yes: "Mycket nöjd", no: "Extremt nöjd" },
  { icon: "⏳", title: "Varning!", text: "Ditt valpkonto är på väg att gå ut.", yes: "Förnya", no: "Avbryt (rekommenderas inte)" },
];

const saveButton = document.getElementById("save-button");
const popupLayer = document.getElementById("popup-layer");
const countdownEl = document.getElementById("countdown");
const closedCountEl = document.getElementById("closed-count");
const blade = document.getElementById("blade");
const resultEl = document.getElementById("result");
const title = document.getElementById("title");

let timeLeft = CONFIG.countdownSeconds;
let closedCount = 0;
let zIndex = 1;
let gameOver = false;
let timerId = null;
let audioCtx = null;

// ===== Ljud =====
// Skapas först vid första klicket – webbläsare tillåter inte ljud innan användaren interagerat.
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

const goatSound = new Audio("freesound_community-man-shout-like-a-goat-105005.mp3");

function playErrorSound(delay = 0) {
  setTimeout(() => {
    const goat = goatSound.cloneNode(); // klon så att flera getter kan skrika samtidigt
    goat.volume = CONFIG.volume;
    goat.play();
  }, delay * 1000);
}

// ===== Popups =====
function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomPosition(width, height) {
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  return { x: Math.random() * maxX, y: Math.random() * maxY };
}

function createPopup() {
  const msg = randomItem(POPUP_MESSAGES);
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.style.zIndex = zIndex++;

  popup.innerHTML = `
    <div class="popup__header">
      <span>${msg.title}</span>
      <button class="popup__close" aria-label="Stäng">✕</button>
    </div>
    <div class="popup__body">
      <span class="popup__icon">${msg.icon}</span>
      <p>${msg.text}</p>
    </div>
    <div class="popup__actions">
      <button data-action="no">${msg.no}</button>
      <button data-action="yes">${msg.yes}</button>
    </div>
  `;

  popup.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => closePopup(popup));
  });

  popupLayer.appendChild(popup);
  const { x, y } = randomPosition(popup.offsetWidth, popup.offsetHeight);
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
}

function spawnPopups(count) {
  const room = CONFIG.maxPopups - popupLayer.children.length;
  for (let i = 0; i < Math.min(count, room); i++) {
    createPopup();
    playErrorSound(i * 0.15); // liten förskjutning så två popups ger två tydliga ljud
  }
}

function closePopup(popup) {
  if (gameOver) return;
  popup.remove();
  closedCount++;
  closedCountEl.textContent = closedCount;
  if (closedCount >= CONFIG.popupsToSpace) {
    goToSpace();
    return;
  }
  spawnPopups(CONFIG.popupsPerClose);
}

// ===== Spelflöde =====
function startCountdown() {
  if (timerId) return;
  timerId = setInterval(tick, 1000);
}

function tick() {
  timeLeft--;
  countdownEl.textContent = timeLeft;
  updateBlade();
  if (timeLeft <= 0) endGame(false);
}

function updateBlade() {
  const progress = 1 - timeLeft / CONFIG.countdownSeconds;
  const maxDrop = 150; // px – stannar ovanför valpen
  blade.style.top = `${16 + progress * maxDrop}px`;
}

function endGame(won) {
  gameOver = true;
  clearInterval(timerId);
  popupLayer.innerHTML = "";
  resultEl.hidden = false;
  resultEl.innerHTML = won
    ? "🎉 Valpen är räddad! 🐶"
    : "⏰ För sent!<br><small></small>";
}

function goToSpace() {
  gameOver = true;
  clearInterval(timerId);
  popupLayer.innerHTML = "";
  resultEl.hidden = false;
  resultEl.innerHTML = "📡 Inkommande sändning från NASA…<br><small>Valpen har lämnat giljotinen.</small>";
  setTimeout(() => { window.location.href = "nasa.html"; }, 1500);
}

saveButton.addEventListener("click", () => {
  if (gameOver) return;
  startCountdown();
  spawnPopups(1);
});

title.addEventListener("click", (event) => {
  if (event.detail === CONFIG.secretClicksToWin) endGame(true);
});