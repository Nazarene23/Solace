const fs = require("node:fs");
const path = require("node:path");

const HEALTH_WRITE_INTERVAL_MS = 15_000;

const healthPath = path.join(
  __dirname,
  "../data/runtimeHealth.json",
);

let client = null;
let writeTimer = null;

const health = {
  processStartedAt:
    new Date().toISOString(),

  lastUpdatedAt: null,

  discord: {
    ready: false,
    gatewayPing: null,
    lastReadyAt: null,
    lastDisconnectAt: null,
    lastResumeAt: null,
    lastGatewayEvent: "STARTING",
    lastGatewayError: null,
  },

  interactions: {
    lastReceivedAt: null,
    lastCommandName: null,
    receivedSinceStart: 0,
  },

  scheduler: {
    lastCheckAt: null,
    lastSuccessfulPostAt: null,
    lastFailedPostAt: null,
    lastError: null,
  },

  process: {
    pid: process.pid,
    nodeVersion: process.version,
    memoryRssBytes: 0,
    uptimeSeconds: 0,
  },
};

function getTimestamp() {
  return new Date().toISOString();
}

function cleanMessage(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .replaceAll(
      process.env.DISCORD_TOKEN ?? "",
      "[REDACTED]",
    )
    .replaceAll(
      process.env.TELEGRAM_BOT_TOKEN ?? "",
      "[REDACTED]",
    )
    .slice(0, 500);
}

function refreshLiveValues() {
  const memory =
    process.memoryUsage();

  health.lastUpdatedAt =
    getTimestamp();

  health.process.pid =
    process.pid;

  health.process.nodeVersion =
    process.version;

  health.process.memoryRssBytes =
    memory.rss;

  health.process.uptimeSeconds =
    Math.floor(process.uptime());

  if (!client) {
    return;
  }

  health.discord.ready =
    client.isReady();

  const ping =
    client.ws?.ping;

  health.discord.gatewayPing =
    Number.isFinite(ping) &&
    ping >= 0
      ? Math.round(ping)
      : null;
}

function writeHealthFile() {
  try {
    refreshLiveValues();

    fs.writeFileSync(
      healthPath,
      JSON.stringify(
        health,
        null,
        2,
      ),
      "utf8",
    );
  } catch (error) {
    console.error(
      "[HEALTH] Could not write runtime health:",
      error,
    );
  }
}

function start(clientInstance) {
  if (client || writeTimer) {
    return;
  }

  client = clientInstance;

  client.on(
    "clientReady",
    () => {
      health.discord.ready = true;

      health.discord.lastReadyAt =
        getTimestamp();

      health.discord.lastGatewayEvent =
        "READY";

      health.discord.lastGatewayError =
        null;

      writeHealthFile();

      console.log(
        "[HEALTH] Runtime health reporting started.",
      );
    },
  );

  client.on(
    "interactionCreate",
    (interaction) => {
      if (
        !interaction.isChatInputCommand()
      ) {
        return;
      }

      health.interactions.lastReceivedAt =
        getTimestamp();

      health.interactions.lastCommandName =
        interaction.commandName;

      health.interactions.receivedSinceStart +=
        1;

      writeHealthFile();
    },
  );

  client.on(
    "shardDisconnect",
    (event, shardId) => {
      health.discord.ready = false;

      health.discord.lastDisconnectAt =
        getTimestamp();

      health.discord.lastGatewayEvent =
        `SHARD_${shardId}_DISCONNECTED`;

      health.discord.lastGatewayError =
        cleanMessage(
          `${event.code}: ${event.reason}`,
        );

      writeHealthFile();

      console.warn(
        `[GATEWAY] Shard ${shardId} disconnected (${event.code}).`,
      );
    },
  );

  client.on(
    "shardReconnecting",
    (shardId) => {
      health.discord.ready = false;

      health.discord.lastGatewayEvent =
        `SHARD_${shardId}_RECONNECTING`;

      writeHealthFile();

      console.warn(
        `[GATEWAY] Shard ${shardId} reconnecting.`,
      );
    },
  );

  client.on(
    "shardResume",
    (
      shardId,
      replayedEvents,
    ) => {
      health.discord.ready = true;

      health.discord.lastResumeAt =
        getTimestamp();

      health.discord.lastGatewayEvent =
        `SHARD_${shardId}_RESUMED`;

      health.discord.lastGatewayError =
        null;

      writeHealthFile();

      console.log(
        `[GATEWAY] Shard ${shardId} resumed with ${replayedEvents} replayed event(s).`,
      );
    },
  );

  client.on(
    "shardError",
    (error, shardId) => {
      health.discord.lastGatewayEvent =
        `SHARD_${shardId}_ERROR`;

      health.discord.lastGatewayError =
        cleanMessage(error?.message);

      writeHealthFile();

      console.error(
        `[GATEWAY] Shard ${shardId} error:`,
        error,
      );
    },
  );

  client.on(
    "invalidated",
    () => {
      health.discord.ready = false;

      health.discord.lastGatewayEvent =
        "SESSION_INVALIDATED";

      writeHealthFile();

      console.error(
        "[GATEWAY] Discord session invalidated.",
      );
    },
  );

  client.on(
    "error",
    (error) => {
      health.discord.lastGatewayEvent =
        "CLIENT_ERROR";

      health.discord.lastGatewayError =
        cleanMessage(error?.message);

      writeHealthFile();

      console.error(
        "[DISCORD CLIENT]",
        error,
      );
    },
  );

  writeHealthFile();

  writeTimer = setInterval(
    writeHealthFile,
    HEALTH_WRITE_INTERVAL_MS,
  );
}

function recordSchedulerCheck() {
  health.scheduler.lastCheckAt =
    getTimestamp();

  writeHealthFile();
}

function recordDailyPostSuccess() {
  health.scheduler.lastSuccessfulPostAt =
    getTimestamp();

  health.scheduler.lastError =
    null;

  writeHealthFile();
}

function recordDailyPostFailure(error) {
  health.scheduler.lastFailedPostAt =
    getTimestamp();

  health.scheduler.lastError =
    cleanMessage(error?.message);

  writeHealthFile();
}

module.exports = {
  start,
  recordSchedulerCheck,
  recordDailyPostSuccess,
  recordDailyPostFailure,
};