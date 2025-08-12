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
    // Clear previous session data for new user
    userMessageId = null;
    localStorage.removeItem("userMessageId");
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
  stopWatchTimer(); // Update current session if watching
  const deviceInfo = navigator.userAgent.split(' ').slice(-2).join(' '); // Shortened device info
  const currentStatus = watchStartTime ? `🔴 Currently watching: ${watchHistory[watchHistory.length - 1]?.name}` : `⚫ Idle`;
  
  let message = `👤 User: ${userName || 'Guest'}\n`;
  message += `📱 Device: ${deviceInfo}\n`;
  message += `🕐 Session Start: ${sessionStartTime}\n`;
  message += `📊 Status: ${currentStatus}\n`;
  message += `⏱️ Total Watch Time: ${formatTime(totalWatchSeconds)}\n\n`;

  // Recent watch history (last 5)
  const recentHistory = watchHistory.slice(-5);
  if (recentHistory.length > 0) {
    message += `📺 Recent Streams (${recentHistory.length}/${watchHistory.length}):\n`;
    recentHistory.forEach((w, i) => {
      const status = w.end ? '✅' : '🔴';
      message += `${status} ${w.name} (${formatTime(w.duration)})\n`;
    });
  } else {
    message += `📺 No streams watched yet\n`;
  }

  // Recent external clicks (last 3)
  const recentExternal = externalClicks.slice(-3);
  if (recentExternal.length > 0) {
    message += `\n🔗 External Clicks (${recentExternal.length}/${externalClicks.length}):\n`;
    recentExternal.forEach((c) => {
      message += `• ${c.name}\n`;
    });
  }

  // Recent ad clicks (last 3)
  const recentAds = adClicks.slice(-3);
  if (recentAds.length > 0) {
    message += `\n📢 Ad Clicks (${recentAds.length}/${adClicks.length}):\n`;
    recentAds.forEach((a) => {
      message += `• ${a.adName}\n`;
    });
  }

  message += `\n🔄 Last Updated: ${new Date().toLocaleString()}`;
  return message;
}

async function updateTelegramMessage() {
  if (!userName) return;

  const message = generateMessage();
  
  try {
    if (userMessageId) {
      // Update existing message
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
        console.log('Failed to edit message, creating new one...');
        await createNewMessage(message);
      }
    } else {
      // Create new message
      await createNewMessage(message);
    }
  } catch (error) {
    console.log('Error updating Telegram message:', error);
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
      console.log('New Telegram message created with ID:', userMessageId);
    }
  } catch (error) {
    console.log('Error creating new Telegram message:', error);
  }
}

// Update message periodically while user is active
let updateInterval = null;

function startPeriodicUpdates() {
  if (updateInterval) return;
  
  updateInterval = setInterval(() => {
    if (userName && (watchStartTime || document.hasFocus())) {
      updateTelegramMessage();
    }
  }, 30000); // Update every 30 seconds when active
}

function stopPeriodicUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Final update on page unload
function sendFinalUpdate() {
  stopWatchTimer();
  const message = generateMessage();
  
  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    message_id: userMessageId,
    text: message + '\n\n👋 Session Ended'
  });

  if (userMessageId) {
    const editUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(editUrl, blob);
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  showNamePopup();
  
  if (!sessionStartTime) {
    sessionStartTime = new Date().toLocaleString();
    localStorage.setItem("sessionStartTime", sessionStartTime);
  }
  
  // Initial message update
  if (userName) {
    updateTelegramMessage();
    startPeriodicUpdates();
  }
  
  // Start periodic updates when user provides name
  const originalShowNamePopup = showNamePopup;
  showNamePopup = function() {
    originalShowNamePopup();
    if (userName && !updateInterval) {
      updateTelegramMessage();
      startPeriodicUpdates();
    }
  };
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      updateTelegramMessage();
      stopPeriodicUpdates();
    } else {
      startPeriodicUpdates();
    }
  });
  
  // Final update on page unload
  window.addEventListener("beforeunload", sendFinalUpdate);
  window.addEventListener("pagehide", sendFinalUpdate);
});

// Also update when user starts/stops watching
const originalStartWatchTimer = startWatchTimer;
const originalStopWatchTimer = stopWatchTimer;

startWatchTimer = function(streamName) {
  originalStartWatchTimer(streamName);
  updateTelegramMessage();
};

stopWatchTimer = function() {
  originalStopWatchTimer();
  updateTelegramMessage();
};