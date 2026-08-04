require("dotenv").config();

const os = require("node:os");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const CHECK_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 6 * 60 * 60 * 1000;

const telegramToken =
  process.env.TELEGRAM_BOT_TOKEN;

const telegramChatId =
  process.env.TELEGRAM_CHAT_ID;

if (!telegramToken || !telegramChatId) {
  console.error(
    "[MONITOR] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.",
  );

  process.exit(1);
}

let previousState = null;
let lastHeartbeatAt = 0;
let pendingMessages = [];

async function sendTelegram(message) {
  const response = await fetch(
    `https://api.telegram.org/bot${telegramToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description ??
        `Telegram returned HTTP ${response.status}.`,
    );
  }
}

async function getSolaceProcessStatus() {
  try {
    const { stdout } = await execFileAsync(
      "pm2",
      ["jlist"],
      {
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      },
    );

    const processes = JSON.parse(stdout);

    const solace = processes.find(
      (processInfo) =>
        processInfo.name === "solace",
    );

    return solace?.pm2_env?.status ?? "stopped";
  } catch (error) {
    console.error(
      "[MONITOR] Could not read PM2 status:",
      error.message,
    );

    return "unknown";
  }
}

async function canReachDiscord() {
  try {
    const response = await fetch(
      "https://discord.com/api/v10/gateway",
      {
        signal: AbortSignal.timeout(10_000),
      },
    );

    return response.ok;
  } catch {
    return false;
  }
}

function formatUptime(seconds) {
  const totalMinutes = Math.floor(
    seconds / 60,
  );

  const days = Math.floor(
    totalMinutes / 1440,
  );

  const hours = Math.floor(
    (totalMinutes % 1440) / 60,
  );

  const minutes =
    totalMinutes % 60;

  return [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    `${minutes}m`,
  ]
    .filter(Boolean)
    .join(" ");
}

function getTimestamp() {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      timeZone: "Asia/Manila",
      dateStyle: "medium",
      timeStyle: "medium",
    },
  ).format(new Date());
}

function createStatusMessage(state, title) {
  const processIcon =
    state.processStatus === "online"
      ? "🟢"
      : state.processStatus === "unknown"
        ? "🟠"
        : "🔴";

  const discordIcon =
    state.discordReachable
      ? "🟢"
      : "🔴";

  const memoryUsed =
    os.totalmem() - os.freemem();

  const memoryPercent = Math.round(
    (memoryUsed / os.totalmem()) * 100,
  );

  return [
    title,
    "",
    `${processIcon} Solace process: ${state.processStatus}`,
    `${discordIcon} Discord API: ${
      state.discordReachable
        ? "reachable"
        : "unreachable"
    }`,
    `⏱️ Phone uptime: ${formatUptime(os.uptime())}`,
    `💾 RAM usage: ${memoryPercent}%`,
    `🕒 ${getTimestamp()}`,
  ].join("\n");
}

async function runCheck() {
  const state = {
    processStatus:
      await getSolaceProcessStatus(),

    discordReachable:
      await canReachDiscord(),
  };

  const stateChanged =
    !previousState ||
    previousState.processStatus !==
      state.processStatus ||
    previousState.discordReachable !==
      state.discordReachable;

  if (stateChanged) {
    const title = !previousState
      ? "🌱 Solace Monitor started"
      : "⚠️ Solace status changed";

    pendingMessages.push(
      createStatusMessage(
        state,
        title,
      ),
    );

    previousState = state;
  }

  const heartbeatDue =
    Date.now() - lastHeartbeatAt >=
    HEARTBEAT_INTERVAL_MS;

  if (
    heartbeatDue &&
    pendingMessages.length === 0
  ) {
    pendingMessages.push(
      createStatusMessage(
        state,
        "💙 Solace monitoring heartbeat",
      ),
    );
  }

  if (pendingMessages.length === 0) {
    return;
  }

  try {
    await sendTelegram(
      pendingMessages.join("\n\n"),
    );

    pendingMessages = [];
    lastHeartbeatAt = Date.now();

    console.log(
      `[MONITOR] Telegram update sent at ${getTimestamp()}.`,
    );
  } catch (error) {
    console.error(
      "[MONITOR] Telegram notification failed:",
      error.message,
    );
  }
}

console.log(
  "[MONITOR] Solace monitoring service started.",
);

runCheck().catch(console.error);

setInterval(() => {
  runCheck().catch(console.error);
}, CHECK_INTERVAL_MS);