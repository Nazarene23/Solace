require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const {
  collectSnapshot,
} = require("./services/monitorDataService");

const messages = require(
  "./services/monitorMessageService",
);

const CHECK_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const TELEGRAM_RETRY_DELAY_MS = 2_000;
const MAX_PENDING_NOTIFICATIONS = 20;

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = String(process.env.TELEGRAM_CHAT_ID ?? "");

const statePath = path.join(
  __dirname,
  "data/monitorState.json",
);

const historyPath = path.join(
  __dirname,
  "data/monitorHistory.json",
);

if (!telegramToken || !telegramChatId) {
  console.error(
    "[MONITOR] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.",
  );

  process.exit(1);
}

function createDefaultStats() {
  return {
    periodStartedAt: new Date().toISOString(),
    checks: 0,
    healthyChecks: 0,
    solaceRestarts: 0,
    discordOutages: 0,
    lowestBattery: null,
    highestTemperature: null,
  };
}

function createDefaultState() {
  return {
    telegramOffset: 0,
    telegramInitialized: false,
    initialized: false,
    lastHeartbeatAt: 0,
    lastDailyReportDate: null,
    pendingNotifications: [],

    debounce: {
      discordRest: {
        confirmed: null,
        successes: 0,
        failures: 0,
      },
      gateway: {
        confirmed: null,
        successes: 0,
        failures: 0,
      },
      scheduler: {
        confirmed: null,
        successes: 0,
        failures: 0,
      },
      charger: {
        confirmed: null,
        successes: 0,
        failures: 0,
      },
    },

    previous: {
      solaceStatus: null,
      solaceRestarts: null,
      discordRest: null,
      gateway: null,
      scheduler: null,
      charger: null,
      officialIndicator: null,
      settingsValid: null,
      batteryLevel: null,
      temperatureLevel: null,
      storageLevel: null,
    },

    stats: createDefaultStats(),
  };
}

function loadState() {
  const defaults = createDefaultState();

  try {
    if (!fs.existsSync(statePath)) {
      return defaults;
    }

    const saved = JSON.parse(
      fs.readFileSync(statePath, "utf8"),
    );

    return {
      ...defaults,
      ...saved,
      debounce: {
        ...defaults.debounce,
        ...(saved.debounce ?? {}),
      },
      previous: {
        ...defaults.previous,
        ...(saved.previous ?? {}),
      },
      stats: {
        ...defaults.stats,
        ...(saved.stats ?? {}),
      },
      pendingNotifications: Array.isArray(saved.pendingNotifications)
        ? saved.pendingNotifications.slice(-MAX_PENDING_NOTIFICATIONS)
        : [],
    };
  } catch (error) {
    console.error(
      "[MONITOR] Could not load state; starting fresh:",
      error.message,
    );

    return defaults;
  }
}

const state = loadState();

function saveState() {
  try {
    const temporaryPath = `${statePath}.tmp`;

    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(state, null, 2),
      "utf8",
    );

    fs.renameSync(temporaryPath, statePath);
  } catch (error) {
    console.error(
      "[MONITOR] Could not save state:",
      error.message,
    );
  }
}

function appendHistory(entry) {
  try {
    let history = [];

    if (fs.existsSync(historyPath)) {
      history = JSON.parse(
        fs.readFileSync(historyPath, "utf8"),
      );
    }

    if (!Array.isArray(history)) {
      history = [];
    }

    history.push(entry);

    fs.writeFileSync(
      historyPath,
      JSON.stringify(history.slice(-30), null, 2),
      "utf8",
    );
  } catch (error) {
    console.error(
      "[MONITOR] Could not write monitoring history:",
      error.message,
    );
  }
}

async function telegramRequest(method, payload = {}) {
  const response = await fetch(
    `https://api.telegram.org/bot${telegramToken}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description ?? `Telegram returned HTTP ${response.status}.`,
    );
  }

  return result.result;
}

async function sendTelegram(text) {
  return telegramRequest("sendMessage", {
    chat_id: telegramChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

function queueNotification(text) {
  state.pendingNotifications.push({
    text,
    createdAt: new Date().toISOString(),
  });

  state.pendingNotifications = state.pendingNotifications.slice(
    -MAX_PENDING_NOTIFICATIONS,
  );

  saveState();
}

async function flushNotifications() {
  while (state.pendingNotifications.length > 0) {
    const notification = state.pendingNotifications[0];

    try {
      await sendTelegram(notification.text);
      state.pendingNotifications.shift();
      saveState();
    } catch (error) {
      console.error(
        "[MONITOR] Telegram delivery failed; notification queued:",
        error.message,
      );

      return false;
    }
  }

  return true;
}

function updateDebouncedState(
  name,
  rawValue,
  failureThreshold = 3,
  successThreshold = 2,
) {
  const item = state.debounce[name];

  if (!item) {
    throw new Error(`Unknown debounce state: ${name}`);
  }

  if (rawValue) {
    item.successes += 1;
    item.failures = 0;

    if (item.successes >= successThreshold) {
      item.confirmed = true;
    }
  } else {
    item.failures += 1;
    item.successes = 0;

    if (item.failures >= failureThreshold) {
      item.confirmed = false;
    }
  }

  return item.confirmed;
}

function getSchedulerFresh(snapshot) {
  const lastCheck = snapshot.runtime?.data?.scheduler?.lastCheckAt;

  if (!lastCheck) {
    return false;
  }

  const ageSeconds =
    (Date.now() - new Date(lastCheck).getTime()) / 1000;

  return Number.isFinite(ageSeconds) && ageSeconds <= 120;
}

function getBatteryLevel(snapshot) {
  const percentage = snapshot.battery?.percentage;

  if (!Number.isFinite(percentage)) {
    return "unknown";
  }

  if (percentage <= 10) {
    return "critical";
  }

  if (percentage <= 20) {
    return "warning";
  }

  return "normal";
}

function getTemperatureLevel(snapshot) {
  const temperature = snapshot.battery?.temperatureCelsius;

  if (!Number.isFinite(temperature)) {
    return "unknown";
  }

  if (temperature >= 43) {
    return "critical";
  }

  if (temperature >= 40) {
    return "warning";
  }

  return "normal";
}

function getStorageLevel(snapshot) {
  const usedPercent = snapshot.storage?.usedPercent;

  if (!Number.isFinite(usedPercent)) {
    return "unknown";
  }

  if (usedPercent >= 95) {
    return "critical";
  }

  if (usedPercent >= 90) {
    return "warning";
  }

  return "normal";
}

function getManilaClock() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

function updateStatistics(snapshot, health) {
  const stats = state.stats;

  stats.checks += 1;

  if (health.healthy) {
    stats.healthyChecks += 1;
  }

  const battery = snapshot.battery?.percentage;
  const temperature = snapshot.battery?.temperatureCelsius;

  if (
    Number.isFinite(battery) &&
    (!Number.isFinite(stats.lowestBattery) || battery < stats.lowestBattery)
  ) {
    stats.lowestBattery = battery;
  }

  if (
    Number.isFinite(temperature) &&
    (!Number.isFinite(stats.highestTemperature) ||
      temperature > stats.highestTemperature)
  ) {
    stats.highestTemperature = temperature;
  }
}

function addAlert(alert) {
  queueNotification(messages.createAlert(alert));
}

function evaluateChanges(snapshot, health) {
  const previous = state.previous;
  const solace = snapshot.pm2?.solace;
  const officialIndicator =
    snapshot.discord?.official?.indicator ?? "unknown";
  const settingsValid = snapshot.scheduler?.settingsValid === true;
  const batteryLevel = getBatteryLevel(snapshot);
  const temperatureLevel = getTemperatureLevel(snapshot);
  const storageLevel = getStorageLevel(snapshot);

  if (!state.initialized) {
    if (
      health.discordRest === null ||
      health.gateway === null ||
      health.scheduler === null
    ) {
      return;
    }

    Object.assign(previous, {
      solaceStatus: solace?.status ?? "missing",
      solaceRestarts: solace?.restartCount ?? 0,
      discordRest: health.discordRest,
      gateway: health.gateway,
      scheduler: health.scheduler,
      charger: health.charger,
      officialIndicator,
      settingsValid,
      batteryLevel,
      temperatureLevel,
      storageLevel,
    });

    state.initialized = true;
    state.lastHeartbeatAt = Date.now();
    queueNotification(messages.createFullStatus(snapshot));
    return;
  }

  const currentSolaceStatus = solace?.status ?? "missing";

  if (currentSolaceStatus !== previous.solaceStatus) {
    addAlert({
      level: currentSolaceStatus === "online" ? "recovery" : "critical",
      title:
        currentSolaceStatus === "online"
          ? "Solace recovered"
          : "Solace process unavailable",
      summary:
        currentSolaceStatus === "online"
          ? "PM2 reports that Solace is online again."
          : "PM2 no longer reports Solace as online.",
      details: [
        {
          icon: currentSolaceStatus === "online" ? "🟢" : "🔴",
          label: "Process",
          value: currentSolaceStatus,
        },
      ],
      snapshot,
    });

    previous.solaceStatus = currentSolaceStatus;
  }

  const restartCount = solace?.restartCount ?? 0;

  if (
    Number.isFinite(previous.solaceRestarts) &&
    restartCount > previous.solaceRestarts
  ) {
    const increase = restartCount - previous.solaceRestarts;
    state.stats.solaceRestarts += increase;

    addAlert({
      level: "info",
      title: "Solace restarted",
      summary: "PM2 detected a new Solace process start.",
      details: [
        {
          icon: "🔄",
          label: "New restarts",
          value: String(increase),
        },
        {
          icon: "⏱",
          label: "Current uptime",
          value: messages.formatDuration(solace?.uptimeSeconds),
        },
      ],
      snapshot,
    });
  }

  previous.solaceRestarts = restartCount;

  for (const [key, label] of [
    ["discordRest", "Discord REST API"],
    ["gateway", "Discord Gateway"],
    ["scheduler", "Daily scheduler"],
  ]) {
    if (health[key] !== null && health[key] !== previous[key]) {
      if (!health[key] && key === "discordRest") {
        state.stats.discordOutages += 1;
      }

      addAlert({
        level: health[key] ? "recovery" : "warning",
        title: health[key] ? `${label} recovered` : `${label} degraded`,
        summary: health[key]
          ? `${label} is responding normally again.`
          : `${label} failed multiple consecutive checks.`,
        details: [
          {
            icon: health[key] ? "🟢" : "🔴",
            label,
            value: health[key] ? "healthy" : "unhealthy",
          },
        ],
        snapshot,
      });

      previous[key] = health[key];
    }
  }

  if (
    health.charger !== null &&
    health.charger !== previous.charger
  ) {
    addAlert({
      level: health.charger ? "recovery" : "warning",
      title: health.charger ? "Power restored" : "Charger disconnected",
      summary: health.charger
        ? "The host phone is receiving external power again."
        : "The host phone has remained unplugged for several checks.",
      details: [
        {
          icon: health.charger ? "🔌" : "🔋",
          label: "Battery",
          value: `${snapshot.battery?.percentage ?? "Unknown"}%`,
        },
      ],
      snapshot,
    });

    previous.charger = health.charger;
  }

  if (officialIndicator !== previous.officialIndicator) {
    addAlert({
      level: officialIndicator === "none" ? "recovery" : "warning",
      title:
        officialIndicator === "none"
          ? "Discord incident resolved"
          : "Discord reports an incident",
      summary:
        snapshot.discord?.official?.description ?? "Discord status changed.",
      details: [
        {
          icon: officialIndicator === "none" ? "🟢" : "⚠️",
          label: "Official status",
          value: officialIndicator,
        },
      ],
      snapshot,
    });

    previous.officialIndicator = officialIndicator;
  }

  if (settingsValid !== previous.settingsValid) {
    addAlert({
      level: settingsValid ? "recovery" : "critical",
      title: settingsValid ? "Settings data recovered" : "Settings data invalid",
      summary: settingsValid
        ? "The private guild settings file is readable again."
        : "The monitor could not safely parse the guild settings file.",
      details: [
        {
          icon: settingsValid ? "🟢" : "🔴",
          label: "Settings",
          value: settingsValid ? "valid" : "invalid",
        },
      ],
      snapshot,
    });

    previous.settingsValid = settingsValid;
  }

  for (const [key, currentLevel, title, value] of [
    [
      "batteryLevel",
      batteryLevel,
      "Battery level",
      `${snapshot.battery?.percentage ?? "Unknown"}%`,
    ],
    [
      "temperatureLevel",
      temperatureLevel,
      "Battery temperature",
      Number.isFinite(snapshot.battery?.temperatureCelsius)
        ? `${snapshot.battery.temperatureCelsius.toFixed(1)}°C`
        : "Unavailable",
    ],
    [
      "storageLevel",
      storageLevel,
      "Storage usage",
      Number.isFinite(snapshot.storage?.usedPercent)
        ? `${snapshot.storage.usedPercent}% used`
        : "Unavailable",
    ],
  ]) {
    if (currentLevel !== previous[key] && currentLevel !== "unknown") {
      if (previous[key] !== null) {
        addAlert({
          level:
            currentLevel === "normal"
              ? "recovery"
              : currentLevel === "critical"
                ? "critical"
                : "warning",
          title:
            currentLevel === "normal" ? `${title} recovered` : `${title} warning`,
          summary:
            currentLevel === "normal"
              ? `${title} returned to a normal range.`
              : `${title} crossed the ${currentLevel} threshold.`,
          details: [
            {
              icon:
                currentLevel === "normal"
                  ? "🟢"
                  : currentLevel === "critical"
                    ? "🔴"
                    : "🟠",
              label: title,
              value,
            },
          ],
          snapshot,
        });
      }

      previous[key] = currentLevel;
    }
  }
}

async function maybeSendHeartbeat(snapshot) {
  if (Date.now() - state.lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) {
    return;
  }

  queueNotification(messages.createHeartbeat(snapshot));
  state.lastHeartbeatAt = Date.now();
}

async function maybeSendDailyReport(snapshot) {
  const clock = getManilaClock();
  const periodAge =
    Date.now() - new Date(state.stats.periodStartedAt).getTime();

  if (
    clock.hour < 7 ||
    state.lastDailyReportDate === clock.date ||
    periodAge < 20 * 60 * 60 * 1000
  ) {
    return;
  }

  const completedStats = {
    ...state.stats,
  };

  queueNotification(
    messages.createDailySummary(snapshot, completedStats),
  );

  appendHistory({
    reportDate: clock.date,
    createdAt: new Date().toISOString(),
    ...completedStats,
  });

  state.lastDailyReportDate = clock.date;
  state.stats = createDefaultStats();
}

async function runCheck() {
  const snapshot = await collectSnapshot();

  const chargerConnected =
    snapshot.battery?.available === true &&
    snapshot.battery?.plugged !== "UNPLUGGED";

  const health = {
    discordRest: updateDebouncedState(
      "discordRest",
      snapshot.discord?.rest?.reachable === true,
      3,
      2,
    ),

    gateway: updateDebouncedState(
      "gateway",
      messages.isGatewayHealthy(snapshot),
      3,
      2,
    ),

    scheduler: updateDebouncedState(
      "scheduler",
      getSchedulerFresh(snapshot),
      4,
      2,
    ),

    charger: updateDebouncedState(
      "charger",
      chargerConnected,
      10,
      2,
    ),
  };

  health.healthy =
    snapshot.pm2?.solace?.status === "online" &&
    health.discordRest === true &&
    health.gateway === true &&
    health.scheduler === true;

  updateStatistics(snapshot, health);
  evaluateChanges(snapshot, health);
  await maybeSendHeartbeat(snapshot);
  await maybeSendDailyReport(snapshot);
  saveState();
  await flushNotifications();
}

async function checkLoop() {
  try {
    await runCheck();
  } catch (error) {
    console.error(
      "[MONITOR] Health check failed:",
      error,
    );
  } finally {
    setTimeout(checkLoop, CHECK_INTERVAL_MS);
  }
}

async function handleTelegramCommand(message) {
  if (String(message.chat?.id ?? "") !== telegramChatId) {
    console.warn("[MONITOR] Ignored Telegram message from an unauthorized chat.");
    return;
  }

  const text = String(message.text ?? "").trim();
  const command = text
    .split(/\s+/)[0]
    .split("@")[0]
    .toLowerCase();

  if (!["/start", "/help", "/status", "/health", "/device", "/scheduler", "/processes"].includes(command)) {
    await sendTelegram(messages.createHelp());
    return;
  }

  if (command === "/start" || command === "/help") {
    await sendTelegram(messages.createHelp());
    return;
  }

  const snapshot = await collectSnapshot();

  const response =
    command === "/device"
      ? messages.createDeviceReport(snapshot)
      : command === "/scheduler"
        ? messages.createSchedulerReport(snapshot)
        : command === "/processes"
          ? messages.createProcessReport(snapshot)
          : messages.createFullStatus(snapshot);

  await sendTelegram(response);
}

async function initializeTelegramOffset() {
  if (state.telegramInitialized) {
    return;
  }

  const updates = await telegramRequest("getUpdates", {
    timeout: 0,
    limit: 100,
    allowed_updates: ["message"],
  });

  const latest = updates.at(-1);

  if (latest) {
    state.telegramOffset = latest.update_id + 1;
  }

  state.telegramInitialized = true;
  saveState();
}

async function telegramPollingLoop() {
  try {
    await initializeTelegramOffset();

    const updates = await telegramRequest("getUpdates", {
      offset: state.telegramOffset,
      timeout: 20,
      limit: 20,
      allowed_updates: ["message"],
    });

    for (const update of updates) {
      state.telegramOffset = update.update_id + 1;
      saveState();

      if (update.message) {
        try {
          await handleTelegramCommand(update.message);
        } catch (error) {
          console.error(
            "[MONITOR] Telegram command failed:",
            error.message,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "[MONITOR] Telegram polling failed:",
      error.message,
    );

    await new Promise((resolve) => {
      setTimeout(resolve, TELEGRAM_RETRY_DELAY_MS);
    });
  }

  setImmediate(telegramPollingLoop);
}

console.log("[MONITOR] Advanced Solace monitoring service started.");

void checkLoop();
void telegramPollingLoop();