// telegram.js
const TELEGRAM_BOT_TOKEN = "7285268410:AAGpod5K5snsYq9FWAYTzUryW3lsHx3L5Oc";
const TELEGRAM_CHAT_ID = "1572380763";

let userName = localStorage.getItem("userName") || null;
let watchStartTime = null;
let totalWatchSeconds = 0;
let watchHistory = [];
let externalClicks = [];
let adClicks = [];

// Format time helper
function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

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
  }
}

// Start tracking watch time
function startWatchTimer(streamName) {
  watchStartTime = Date.now();
  watchHistory.push({
    name: streamName,
    start: new Date().toLocaleString(),
    end: null,
    duration: 0
  });
}

// Stop tracking watch time
function stopWatchTimer() {
  if (!watchStartTime || watchHistory.length === 0) return;
  const now = Date.now();
  const duration = Math.floor((now - watchStartTime) / 1000);
  totalWatchSeconds += duration;
  watchHistory[watchHistory.length - 1].end = new Date().toLocaleString();
  watchHistory[watchHistory.length - 1].duration = duration;
  watchStartTime = null;
}

// Track external click
function trackExternalPlayer(name) {
  externalClicks.push({ name, time: new Date().toLocaleString() });
}

// Track ad click
function trackAdClick(adName) {
  adClicks.push({ adName, time: new Date().toLocaleString() });
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

// Broadcast check
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

// Send summary report
function sendSummary() {
  stopWatchTimer();
  const deviceInfo = navigator.userAgent;
  let message = `🚨 Scooby Viewer:\n`;
  message += `Name: ${userName || 'Guest'}\n`;
  message += `Device: ${deviceInfo}\n`;
  message += `Login Time: ${new Date(performance.timing.navigationStart).toLocaleString()}\n\n`;

  if (watchHistory.length > 0) {
    message += `📺 Watch History:\n`;
    watchHistory.forEach((w, i) => {
      message += `${i+1}. ${w.name}\n   Start: ${w.start}\n   End: ${w.end}\n   Duration: ${formatTime(w.duration)}\n`;
    });
  } else {
    message += `🔴 Not watching anything\n`;
  }

  message += `\n🔗 External Player Clicks:\n`;
  if (externalClicks.length > 0) {
    externalClicks.forEach((c, i) => {
      message += `${i+1}. ${c.name}\n   Time: ${c.time}\n`;
    });
  } else {
    message += `None\n`;
  }

  message += `\n📢 Ad Clicks:\n`;
  if (adClicks.length > 0) {
    adClicks.forEach((a, i) => {
      message += `${i+1}. ${a.adName}\n   Time: ${a.time}\n`;
    });
  } else {
    message += `None\n`;
  }

  message += `\n⏱️ Total Watch Time: ${formatTime(totalWatchSeconds)}`;

  sendToTelegram(message);
}

// On page load
document.addEventListener("DOMContentLoaded", () => {
  showNamePopup();
  window.addEventListener("beforeunload", sendSummary);
});