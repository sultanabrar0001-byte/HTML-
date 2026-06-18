// script.js
import { database, ref, set, onValue, update } from "./firebase-config.js";

const tempElement = document.getElementById("temp-value");
const humElement = document.getElementById("hum-value");
const clockElement = document.getElementById("clock-time");
const connectionDot = document.getElementById("connection-dot");
const connectionText = document.getElementById("connection-text");
const micButton = document.getElementById("mic-btn");
const speechResultText = document.getElementById("speech-text");
const terminalBody = document.getElementById("terminal-body");
const toastElement = document.getElementById("toast-notif");
const toastMessageElement = document.getElementById("toast-msg");

let isDbConnected = false;

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  clockElement.textContent = `${hours}:${minutes}:${seconds} WIB`;
}
setInterval(updateClock, 1000);
updateClock();

function addLog(message, type = 'info') {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  const logRow = document.createElement("div");
  logRow.className = `log-line ${type}`;
  logRow.innerHTML = `<span class="timestamp">[${timeStr}]</span> <span>${message}</span>`;
  terminalBody.appendChild(logRow);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function showToast(message) {
  toastMessageElement.textContent = message;
  toastElement.classList.add("show");
  setTimeout(() => toastElement.classList.remove("show"), 3000);
}

try {
  const sensorRef = ref(database, 'sensor');
  onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      tempElement.textContent = `${data.temperature || 0}°C`;
      humElement.textContent = `${data.humidity || 0}%`;
      addLog(`Sensor: Suhu ${data.temperature}°C, Kelembaban ${data.humidity}%`, "success");
    }
  });

  const relayRef = ref(database, 'relay');
  onValue(relayRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      for (let i = 1; i <= 4; i++) {
        const val = data[`relay${i}`];
        const item = document.getElementById(`relay-card-${i}`);
        const status = document.getElementById(`relay-status-${i}`);
        if (val === 1) {
          item.classList.add("active");
          status.textContent = "AKTIF";
        } else {
          item.classList.remove("active");
          status.textContent = "NONAKTIF";
        }
      }
      if (!isDbConnected) {
        isDbConnected = true;
        connectionDot.classList.add("connected");
        connectionText.textContent = "FIREBASE ONLINE";
        addLog("Koneksi Firebase Realtime Database Aktif.", "success");
        showToast("Firebase berhasil terhubung!");
      }
    }
  });
} catch (err) {
  addLog(`Firebase Error: ${err.message}`, "warning");
}

async function controlRelay(num, state) {
  try {
    await update(ref(database, 'relay'), { [`relay${num}`]: state === "ON" ? 1 : 0 });
    addLog(`Sinyal ${state} dikirim ke Relay ${num}`, "info");
  } catch (error) {
    addLog(`Error Relay: ${error.message}`, "warning");
  }
}

for (let i = 1; i <= 4; i++) {
  document.getElementById(`btn-on-${i}`)?.addEventListener("click", () => controlRelay(i, "ON"));
  document.getElementById(`btn-off-${i}`)?.addEventListener("click", () => controlRelay(i, "OFF"));
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const rec = new SpeechRecognition();
  rec.lang = 'id-ID';
  
  micButton.addEventListener("click", () => {
    rec.start();
    micButton.classList.add("listening");
    speechResultText.textContent = "Mendengarkan ucapan...";
  });

  rec.onresult = (e) => {
    const text = e.results[0][0].transcript.toLowerCase();
    speechResultText.innerHTML = `Mengenali: "<strong>${text}</strong>"`;
    addLog(`Voice: "${text}"`, "voice");
    processVoice(text);
  };

  rec.onend = () => micButton.classList.remove("listening");
}

function processVoice(cmd) {
  if (cmd.includes("nyalakan semua lampu")) {
    setAll(1);
  } else if (cmd.includes("matikan semua lampu")) {
    setAll(0);
  } else {
    let num = null;
    if (cmd.includes("lampu 1") || cmd.includes("lampu satu")) num = 1;
    else if (cmd.includes("lampu 2") || cmd.includes("lampu dua")) num = 2;
    else if (cmd.includes("lampu 3") || cmd.includes("lampu tiga")) num = 3;
    else if (cmd.includes("lampu 4") || cmd.includes("lampu empat")) num = 4;

    if (num) {
      if (cmd.includes("nyalakan") || cmd.includes("hidupkan")) controlRelay(num, "ON");
      else if (cmd.includes("matikan") || cmd.includes("padamkan")) controlRelay(num, "OFF");
    }
  }
}

async function setAll(val) {
  await update(ref(database, 'relay'), { relay1: val, relay2: val, relay3: val, relay4: val });
}
