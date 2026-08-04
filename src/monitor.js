require("dotenv").config();

const os = require("node:os");

const {
  execFile,
} = require("node:child_process");

const {
  promisify,
} = require("node:util");

const execFileAsync =
  promisify(execFile);

const CHECK_INTERVAL_MS = 30_000;

const HEARTBEAT_INTERVAL_MS =
  6 * 60 * 60 * 1000;

const DISCORD_FAILURE_THRESHOLD = 3;
const DISCORD_SUCCESS_THRESHOLD = 2;

const telegramToken =
  process.env.TELEGRAM_BOT_TOKEN;

const telegramChatId =
  process.env.TELEGRAM_CHAT_ID;

if (!telegramToken || !telegramChatId) {
  console.error(
    "[MONITOR] Telegram configuration is missing.",
  );

  process.exit(1);
}

let confirmedDiscordStatus = null;

let discordFailureCount = 0;
let discordSuccessCount = 0;

let previousReportedState = null;
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
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),

      signal:
        AbortSignal.timeout(15_000),
    },
  );

  const result =
    await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description ??
        `Telegram returned HTTP ${response.status}.`,
    );
  }
}

async function getSolaceProcessStatus() {
  try {
    const {
      stdout,
    } = await execFileAsync(
      "pm2",
      ["jlist"],
      {
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      },
    );

    const processes =
      JSON.parse(stdout);

    const solace =
      processes.find(
        (processInfo) =>
          processInfo.name ===
          "solace",
      );

    return (
      solace?.pm2_env?.status ??
      "stopped"
    );
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
        signal:
          AbortSignal.timeout(10_000),
      },
    );

    return response.ok;
  } catch {
    return false;
  }
}

function updateDiscordStatus(
  reachable,
) {
  if (reachable) {
    discordSuccessCount += 1;
    discordFailureCount = 0;

    if (
      discordSuccessCount >=
      DISCORD_SUCCESS_THRESHOLD
    ) {
      confirmedDiscordStatus = true;
    }

    return;
  }

  discordFailureCount += 1;
  discordSuccessCount = 0;

  if (
    discordFailureCount >=
    DISCORD_FAILURE_THRESHOLD
  ) {
    confirmedDiscordStatus = false;
  }
}

function formatUptime(seconds) {
  const totalMinutes =
    Math.floor(seconds / 60);

  const days =
    Math.floor(
      totalMinutes / 1440,
    );

  const hours =
    Math.floor(
      (totalMinutes % 1440) / 60,
    );

  const minutes =
    totalMinutes % 60;

  return [
    days > 0
      ? `${days}d`
      : null,

    hours > 0
      ? `${hours}h`
      : null,

    `${minutes}m`,
  ]
    .filter(Boolean)
    .join(" ");
}

function getTimestamp() {
  const formatted =
    new Intl.DateTimeFormat(
      "en-PH",
      {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      },
    ).format(new Date());

  return `${formatted} PHT`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getMessageHeader(type) {
  const headers = {
    startup: [
      "🌿 <b>Solace Monitor</b>",
      "<i>Monitoring service initialized</i>",
    ],

    alert: [
      "⚠️ <b>Service Alert</b>",
      "<i>A monitored service changed state</i>",
    ],

    recovery: [
      "✅ <b>Systems Recovered</b>",
      "<i>Services are responding normally</i>",
    ],

    heartbeat: [
      "💙 <b>Solace Heartbeat</b>",
      "<i>Scheduled system health report</i>",
    ],
  };

  return (
    headers[type] ??
    headers.alert
  );
}

function createStatusMessage(
  state,
  type,
) {
  const [
    heading,
    subtitle,
  ] = getMessageHeader(type);

  const processOnline =
    state.processStatus === "online";

  const processIcon =
    processOnline
      ? "🟢"
      : state.processStatus ===
          "unknown"
        ? "🟠"
        : "🔴";

  const discordIcon =
    state.discordReachable
      ? "🟢"
      : "🔴";

  const memoryUsed =
    os.totalmem() -
    os.freemem();

  const memoryPercent =
    Math.round(
      (memoryUsed /
        os.totalmem()) *
        100,
    );

  const processLabel =
    escapeHtml(
      state.processStatus.toUpperCase(),
    );

  const discordLabel =
    state.discordReachable
      ? "REACHABLE"
      : "UNREACHABLE";

  return [
    heading,
    subtitle,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "<b>Service Health</b>",
    `${processIcon} <b>Solace</b>   <code>${processLabel}</code>`,
    `${discordIcon} <b>Discord</b>  <code>${discordLabel}</code>`,
    "",
    "<b>Host Device</b>",
    `⏱ Uptime   <code>${escapeHtml(formatUptime(os.uptime()))}</code>`,
    `💾 Memory   <code>${memoryPercent}% used</code>`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    `<i>${escapeHtml(getTimestamp())}</i>`,
  ].join("\n");
}

function statesMatch(
  first,
  second,
) {
  return (
    first?.processStatus ===
      second?.processStatus &&
    first?.discordReachable ===
      second?.discordReachable
  );
}

async function runCheck() {
  const processStatus =
    await getSolaceProcessStatus();

  const rawDiscordStatus =
    await canReachDiscord();

  updateDiscordStatus(
    rawDiscordStatus,
  );

  if (
    confirmedDiscordStatus ===
    null
  ) {
    return;
  }

  const state = {
    processStatus,

    discordReachable:
      confirmedDiscordStatus,
  };

  const stateChanged =
    !statesMatch(
      state,
      previousReportedState,
    );

  if (stateChanged) {
    let messageType = "alert";

    if (
      previousReportedState ===
      null
    ) {
      messageType = "startup";
    } else if (
      state.processStatus ===
        "online" &&
      state.discordReachable
    ) {
      messageType = "recovery";
    }

    pendingMessages.push(
      createStatusMessage(
        state,
        messageType,
      ),
    );

    previousReportedState = {
      ...state,
    };
  }

  const heartbeatDue =
    Date.now() -
      lastHeartbeatAt >=
    HEARTBEAT_INTERVAL_MS;

  if (
    heartbeatDue &&
    pendingMessages.length === 0
  ) {
    pendingMessages.push(
      createStatusMessage(
        state,
        "heartbeat",
      ),
    );
  }

  if (
    pendingMessages.length === 0
  ) {
    return;
  }

  try {
    await sendTelegram(
      pendingMessages
        .slice(-5)
        .join("\n\n"),
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