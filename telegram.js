// telegram.js - Fixed version with rate limiting
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

// Rate limiting variables
let lastUpdateTime = 0;
let pendingUpdate = false;
let updateTimeout = null;
const UPDATE_COOLDOWN = 2000; // 2 seconds minimum between updates

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
    // Only send initial message, don't flood
    scheduleUpdate();
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
  scheduleUpdate();
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
  scheduleUpdate();
}

function trackExternalPlayer(name) {
  externalClicks.push({ name, time: new Date().toLocaleString() });
  saveToLocalStorage();
  scheduleUpdate();
}

function trackAdClick(adName) {
  adClicks.push({ adName, time: new Date().toLocaleString() });
  saveToLocalStorage();
  scheduleUpdate();
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
    message += `📺 Watch History (${watchHistory.length}):\n`;
    const recent = watchHistory.slice(-3);
    recent.forEach((w) => {
      const status = w.end || !watchStartTime ? '✅' : '🔴';
      message += `${status} ${w.name} (${formatTime(w.duration)})\n`;
    });
  } else {
    message += `📺 No streams watched\n`;
  }

  if (externalClicks.length > 0) {
    message += `\n🔗 External Clicks (${externalClicks.length})\n`;
  }

  if (adClicks.length > 0) {
    message += `📢 Ad Clicks (${adClicks.length})\n`;
  }

  const totalTime = totalWatchSeconds + (watchStartTime ? Math.floor((Date.now() - watchStartTime) / 1000) : 0);
  message += `\n⏱️ Total: ${formatTime(totalTime)}`;
  message += `\n🔄 ${new Date().toLocaleTimeString()}`;
  
  return message;
}

// Rate-limited update function
function scheduleUpdate() {
  if (!userName) return;
  
  const now = Date.now();
  
  // Clear any existing timeout
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
  
  // Check if we need to wait
  const timeSinceLastUpdate = now - lastUpdateTime;
  
  if (timeSinceLastUpdate >= UPDATE_COOLDOWN) {
    // Can update immediately
    updateTelegramMessage();
  } else {
    // Schedule update after cooldown
    const delay = UPDATE_COOLDOWN - timeSinceLastUpdate;
    updateTimeout = setTimeout(() => {
      updateTelegramMessage();
      updateTimeout = null;
    }, delay);
  }
}

async function updateTelegramMessage() {
  if (!userName || pendingUpdate) return;
  
  pendingUpdate = true;
  lastUpdateTime = Date.now();
  
  const message = generateMessage();
  
  try {
    if (userMessageId) {
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
        await createNewMessage(message);
      }
    } else {
      await createNewMessage(message);
    }
  } catch (error) {
    console.log('Telegram error:', error);
  } finally {
    pendingUpdate = false;
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
    console.log('Message creation error:', error);
  }
}

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

// Removed auto-update interval - only update on user actions
document.addEventListener("DOMContentLoaded", () => {
  if (!sessionStartTime) {
    sessionStartTime = new Date().toLocaleString();
    localStorage.setItem("sessionStartTime", sessionStartTime);
  }
  
  showNamePopup();
  
  window.addEventListener("beforeunload", sendSummary);
});