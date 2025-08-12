// telegram.js - Updated for single message per user
const TELEGRAM_BOT_TOKEN = "7285268410:AAGpod5K5snsYq9FWAYTzUryW3lsHx3L5Oc";
const TELEGRAM_CHAT_ID = "1572380763";

let userName = localStorage.getItem("userName") || null;
let userMessageId = localStorage.getItem("userMessageId") || null;
let watchStartTime = null;
let totalWatchSeconds = parseInt(localStorage.getItem("totalWatchSeconds") || "0");
let watchHistory = JSON.parse(localStorage.getItem("watchHistory") || "[]");
let externalClicks = JSON.parse(localStorage.getItem("externalClicks") || "[]");
let adClicks = JSON.parse(localStorage.getItem("adClicks") || "[]");
let sessionStartTime = localStorage.getItem("sessionStartTime") || new Date().toLocaleString();

// Helpers
function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function showNamePopup() {
  if (userName) return;
  const name = prompt("Enter your name:");
  if (name && name.trim() !== "") {
    userName = name.trim();
    localStorage.setItem("userName", userName);
    // Create initial message when user enters name
    updateTelegramMessage();
  }
}

function saveToLocalStorage() {
  localStorage.setItem("totalWatchSeconds", totalWatchSeconds.toString());
  localStorage.setItem("watchHistory", JSON.stringify(watchHistory));
  localStorage.setItem("externalClicks", JSON.stringify(externalClicks));
  localStorage.setItem("adClicks", JSON.stringify(adClicks));
  localStorage.setItem("sessionStartTime", sessionStartTime);
  if (userMessageId) {
    localStorage.setItem("userMessageId", userMessageId);
  }
}

function startWatchTimer(streamName) {
  watchStartTime = Date.now();
  watchHistory.push({
    name: streamName,
    start: new Date().toLocaleString(),
    end: null,
    duration: 0
  });
  saveToLocalStorage();
  updateTelegramMessage();
}

function stopWatchTimer() {
  if (!watchStartTime || watchHistory.length === 0) return;
  const now = Date.now();
  const duration = Math.floor((now - watchStartTime) / 1000);
  totalWatchSeconds += duration;
  watchHistory[watchHistory.length - 1].end = new Date().toLocaleString();
  watchHistory[watchHistory.length - 1].duration = duration;
  watchStartTime = null;
  saveToLocalStorage();
  updateTelegramMessage();
}

function trackExternalPlayer(name) {
  externalClicks.push({ name, time: new Date().toLocaleString() });
  saveToLocalStorage();
  updateTelegramMessage();
}

function trackAdClick(adName) {
  adClicks.push({ adName, time: new Date().toLocaleString() });
  saveToLocalStorage();
  updateTelegramMessage();
}

function checkMaintenanceStatus(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => { if (data.maintenance) alert("⚠️ Site is under maintenance."); })
    .catch(() => {});
}

function checkBroadcast(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => { if (data.broadcast) alert(`📢 Broadcast: ${data.message}`); })
    .catch(() => {});
}

function generateMessage() {
  if (watchStartTime && watchHistory.length > 0) {
    // Update current watching session
    const now = Date.now();
    const currentDuration = Math.floor((now - watchStartTime) / 1000);
    watchHistory[watchHistory.length - 1].duration = currentDuration;
  }

  const deviceInfo = navigator.userAgent.split(' ').slice(-2).join(' ');
  const currentStatus = watchStartTime ? `🔴 Watching: ${watchHistory[watchHistory.length - 1]?.name}` : `⚫ Idle`;
  
  let message = `🚨 Superman Viewer:\n`;
  message += `👤 Name: ${userName || 'Guest'}\n`;
  message += `📱 Device: ${deviceInfo}\n`;
  message += `🕐 Login: ${sessionStartTime}\n`;
  message += `📊 Status: ${currentStatus}\n\n`;

  if (watchHistory.length > 0) {
    message += `📺 Watch History:\n`;
    const recent = watchHistory.slice(-3); // Show last 3
    recent.forEach((w, i) => {
      const status = w.end || !watchStartTime ? '✅' : '🔴';
      message += `${status} ${w.name} (${formatTime(w.duration)})\n`;
    });
    if (watchHistory.length > 3) {
      message += `... and ${watchHistory.length - 3} more\n`;
    }
  } else {
    message += `🔴 Not watching anything\n`;
  }

  if (externalClicks.length > 0) {
    message += `\n🔗 External Clicks (${externalClicks.length}):\n`;
    const recent = externalClicks.slice(-2);
    recent.forEach((c) => {
      message += `• ${c.name}\n`;
    });
  }

  if (adClicks.length > 0) {
    message += `\n📢 Ad Clicks (${adClicks.length}):\n`;
    const recent = adClicks.slice(-2);
    recent.forEach((a) => {
      message += `• ${a.adName}\n`;
    });
  }

  const totalTime = totalWatchSeconds + (watchStartTime ? Math.floor((Date.now() - watchStartTime) / 1000) : 0);
  message += `\n⏱️ Total Watch: ${formatTime(totalTime)}`;
  message += `\n🔄 Updated: ${new Date().toLocaleString()}`;
  
  return message;
}

async function updateTelegramMessage() {
  if (!userName) return;

  const message = generateMessage();
  
  try {
    if (userMessageId) {
      // Try to edit existing message
      const editUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
      const response = await fetch(editUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_id: userMessageId,
          text: message
        })
      });

      if (!response.ok) {
        // If edit fails, create new message
        await createNewMessage(message);
      }
    } else {
      // Create new message
      await createNewMessage(message);
    }
  } catch (error) {
    console.log('Telegram update error:', error);
  }
}

async function createNewMessage(message) {
  try {
    const sendUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message
      })
    });

    if (response.ok) {
      const data = await response.json();
      userMessageId = data.result.message_id;
      localStorage.setItem("userMessageId", userMessageId);
    }
  } catch (error) {
    console.log('New message error:', error);
  }
}

// Send final update with beacon API
function sendSummary() {
  if (!userName || !userMessageId) return;
  
  const finalMessage = generateMessage() + '\n\n👋 Session Ended';
  
  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    message_id: userMessageId,
    text: finalMessage
  });

  const editUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  const blob = new Blob([payload], { type: 'application/json' });
  navigator.sendBeacon(editUrl, blob);
}

// Auto-update every 30 seconds when watching
let updateInterval = null;

function startAutoUpdate() {
  if (updateInterval || !userName) return;
  updateInterval = setInterval(() => {
    if (watchStartTime) {
      updateTelegramMessage();
    }
  }, 30000);
}

function stopAutoUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!sessionStartTime) {
    sessionStartTime = new Date().toLocaleString();
    localStorage.setItem("sessionStartTime", sessionStartTime);
  }
  
  showNamePopup();
  startAutoUpdate();
  
  window.addEventListener("beforeunload", () => {
    stopAutoUpdate();
    sendSummary();
  });
  
  // Update on visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && userName) {
      updateTelegramMessage();
    }
  });
});