// telegram.js
const TELEGRAM_BOT_TOKEN = "7285268410:AAGpod5K5snsYq9FWAYTzUryW3lsHx3L5Oc";
const TELEGRAM_CHAT_ID = "1572380763";
let userName = localStorage.getItem("userName") || null;
let watchStartTime = null;

// Send message to Telegram
function sendToTelegram(message) {
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML"
    })
  }).catch(err => console.error("Telegram send error:", err));
}

// Ask for username popup
function showNamePopup() {
  if (userName) return;
  const name = prompt("Enter your name:");
  if (name && name.trim() !== "") {
    userName = name.trim();
    localStorage.setItem("userName", userName);
    sendToTelegram(`👤 New Visitor: <b>${userName}</b> joined.`);
  }
}

// Start tracking watch time
function startWatchTimer(pageLabel) {
  watchStartTime = Date.now();
  sendToTelegram(`▶️ <b>${userName || 'Guest'}</b> started watching: ${pageLabel}`);
}

// Stop tracking watch time and send to Telegram
function stopWatchTimer(pageLabel) {
  if (!watchStartTime) return;
  const duration = Math.floor((Date.now() - watchStartTime) / 1000);
  sendToTelegram(`⏹ <b>${userName || 'Guest'}</b> stopped watching: ${pageLabel} — Watched ${duration} seconds`);
  watchStartTime = null;
}

// Track external player click
function trackExternalPlayer(name) {
  sendToTelegram(`🌐 <b>${userName || 'Guest'}</b> clicked external stream: ${name}`);
}

// Track ad click
function trackAdClick(adName) {
  sendToTelegram(`📢 <b>${userName || 'Guest'}</b> clicked ad: ${adName}`);
}

// Maintenance check
function checkMaintenanceStatus(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.maintenance) {
        alert("⚠️ Site is under maintenance. Some features may be unavailable.");
      }
    })
    .catch(() => {});
}

// Broadcast message check
function checkBroadcast(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.broadcast) {
        alert(`📢 Broadcast: ${data.message}`);
      }
    })
    .catch(() => {});
}

// Auto-run on page load
document.addEventListener("DOMContentLoaded", () => {
  showNamePopup();
});