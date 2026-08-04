const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  execFile,
} = require("node:child_process");

const {
  promisify,
} = require("node:util");

const execFileAsync =
  promisify(execFile);

const projectRoot = path.join(
  __dirname,
  "../..",
);

const packagePath = path.join(
  projectRoot,
  "package.json",
);

const settingsPath = path.join(
  projectRoot,
  "src/data/guildSettings.json",
);

const settingsBackupPath = path.join(
  projectRoot,
  "src/data/guildSettings.backup.json",
);

const runtimeHealthPath = path.join(
  projectRoot,
  "src/data/runtimeHealth.json",
);

const DISCORD_STATUS_CACHE_MS =
  5 * 60 * 1000;

const GIT_CACHE_MS =
  10 * 60 * 1000;

let discordStatusCache = null;
let discordStatusCachedAt = 0;

let gitCache = null;
let gitCachedAt = 0;

async function runCommand(
  command,
  args = [],
  timeout = 10_000,
) {
  const {
    stdout,
  } = await execFileAsync(
    command,
    args,
    {
      cwd: projectRoot,
      timeout,
      maxBuffer: 2 * 1024 * 1024,
    },
  );

  return stdout.trim();
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        exists: false,
        valid: false,
        data: null,
        error: "File not found.",
      };
    }

    const rawData =
      fs.readFileSync(
        filePath,
        "utf8",
      );

    return {
      exists: true,
      valid: true,
      data: JSON.parse(rawData),
      error: null,
    };
  } catch (error) {
    return {
      exists: true,
      valid: false,
      data: null,
      error: String(
        error?.message ??
          error,
      ).slice(0, 300),
    };
  }
}

function getFileAgeSeconds(
  filePath,
) {
  try {
    const stats =
      fs.statSync(filePath);

    return Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          stats.mtimeMs
        ) / 1000,
      ),
    );
  } catch {
    return null;
  }
}

function getPackageInformation() {
  const packageFile =
    readJsonFile(packagePath);

  return {
    name:
      packageFile.data?.name ??
      "solace",

    version:
      packageFile.data?.version ??
      "unknown",

    nodeVersion:
      process.version,
  };
}

async function getPm2Information() {
  try {
    const output =
      await runCommand(
        "pm2",
        ["jlist"],
      );

    const processes =
      JSON.parse(output);

    const normalizeProcess = (
      processInfo,
    ) => {
      if (!processInfo) {
        return null;
      }

      const startedAt =
        Number(
          processInfo.pm2_env
            ?.pm_uptime,
        ) || null;

      return {
        name:
          processInfo.name ??
          "unknown",

        status:
          processInfo.pm2_env
            ?.status ??
          "unknown",

        pid:
          processInfo.pid ??
          null,

        cpuPercent:
          Number(
            processInfo.monit
              ?.cpu,
          ) || 0,

        memoryBytes:
          Number(
            processInfo.monit
              ?.memory,
          ) || 0,

        restartCount:
          Number(
            processInfo.pm2_env
              ?.restart_time,
          ) || 0,

        unstableRestarts:
          Number(
            processInfo.pm2_env
              ?.unstable_restarts,
          ) || 0,

        exitCode:
          processInfo.pm2_env
            ?.exit_code ??
          null,

        startedAt:
          startedAt
            ? new Date(
                startedAt,
              ).toISOString()
            : null,

        uptimeSeconds:
          startedAt
            ? Math.max(
                0,
                Math.floor(
                  (
                    Date.now() -
                    startedAt
                  ) / 1000,
                ),
              )
            : 0,
      };
    };

    const solace =
      processes.find(
        (processInfo) =>
          processInfo.name ===
          "solace",
      );

    const monitor =
      processes.find(
        (processInfo) =>
          processInfo.name ===
          "solace-monitor",
      );

    return {
      available: true,
      solace:
        normalizeProcess(solace),
      monitor:
        normalizeProcess(monitor),
    };
  } catch (error) {
    return {
      available: false,
      solace: null,
      monitor: null,
      error: String(
        error?.message ??
          error,
      ).slice(0, 300),
    };
  }
}

async function getBatteryInformation() {
  try {
    const output =
      await runCommand(
        "termux-battery-status",
        [],
        15_000,
      );

    const battery =
      JSON.parse(output);

    return {
      available: true,

      present:
        battery.present === true,

      percentage:
        Number(
          battery.percentage,
        ),

      status:
        battery.status ??
        "UNKNOWN",

      health:
        battery.health ??
        "UNKNOWN",

      plugged:
        battery.plugged ??
        "UNPLUGGED",

      temperatureCelsius:
        Number(
          battery.temperature,
        ),

      voltageMillivolts:
        Number(
          battery.voltage,
        ),

      currentMicroamps:
        Number(
          battery.current,
        ),
    };
  } catch (error) {
    return {
      available: false,
      error: String(
        error?.message ??
          error,
      ).slice(0, 300),
    };
  }
}

async function getStorageInformation() {
  try {
    const output =
      await runCommand(
        "df",
        [
          "-Pk",
          projectRoot,
        ],
      );

    const lines =
      output
        .split("\n")
        .filter(Boolean);

    const values =
      lines
        .at(-1)
        .trim()
        .split(/\s+/);

    const totalKilobytes =
      Number(values[1]);

    const usedKilobytes =
      Number(values[2]);

    const freeKilobytes =
      Number(values[3]);

    return {
      available: true,

      totalBytes:
        totalKilobytes *
        1024,

      usedBytes:
        usedKilobytes *
        1024,

      freeBytes:
        freeKilobytes *
        1024,

      usedPercent:
        totalKilobytes > 0
          ? Math.round(
              (
                usedKilobytes /
                totalKilobytes
              ) * 100,
            )
          : null,
    };
  } catch (error) {
    return {
      available: false,
      error: String(
        error?.message ??
          error,
      ).slice(0, 300),
    };
  }
}

async function getDeviceInformation() {
  const safeGetProp = async (
    property,
  ) => {
    try {
      return await runCommand(
        "getprop",
        [property],
      );
    } catch {
      return "unknown";
    }
  };

  const [
    manufacturer,
    model,
    androidVersion,
  ] = await Promise.all([
    safeGetProp(
      "ro.product.manufacturer",
    ),

    safeGetProp(
      "ro.product.model",
    ),

    safeGetProp(
      "ro.build.version.release",
    ),
  ]);

  return {
    manufacturer,
    model,
    androidVersion,

    phoneUptimeSeconds:
      Math.floor(
        os.uptime(),
      ),

    totalMemoryBytes:
      os.totalmem(),

    freeMemoryBytes:
      os.freemem(),

    usedMemoryBytes:
      os.totalmem() -
      os.freemem(),

    memoryUsedPercent:
      Math.round(
        (
          (
            os.totalmem() -
            os.freemem()
          ) /
          os.totalmem()
        ) * 100,
      ),

    loadAverage:
      os.loadavg(),
  };
}

function getRuntimeHealth() {
  const runtimeFile =
    readJsonFile(
      runtimeHealthPath,
    );

  const ageSeconds =
    getFileAgeSeconds(
      runtimeHealthPath,
    );

  const fresh =
    runtimeFile.valid &&
    ageSeconds !== null &&
    ageSeconds <= 45;

  return {
    available:
      runtimeFile.valid,

    fresh,

    ageSeconds,

    data:
      runtimeFile.data,

    error:
      runtimeFile.error,
  };
}

function getSchedulerInformation() {
  const settingsFile =
    readJsonFile(
      settingsPath,
    );

  const backupFile =
    readJsonFile(
      settingsBackupPath,
    );

  const settings =
    settingsFile.valid &&
    settingsFile.data &&
    typeof settingsFile.data ===
      "object"
      ? settingsFile.data
      : {};

  const guildSettings =
    Object.values(settings);

  const enabledSettings =
    guildSettings.filter(
      (guild) =>
        guild?.enabled === true,
    );

  const lastPostDates =
    guildSettings
      .map(
        (guild) =>
          guild?.lastPostedAt,
      )
      .filter(Boolean)
      .map(
        (date) =>
          new Date(date),
      )
      .filter(
        (date) =>
          !Number.isNaN(
            date.getTime(),
          ),
      )
      .sort(
        (first, second) =>
          second.getTime() -
          first.getTime(),
      );

  const primarySchedule =
    enabledSettings.at(0);

  return {
    settingsExists:
      settingsFile.exists,

    settingsValid:
      settingsFile.valid,

    settingsError:
      settingsFile.error,

    backupExists:
      backupFile.exists,

    backupValid:
      backupFile.valid,

    backupAgeSeconds:
      getFileAgeSeconds(
        settingsBackupPath,
      ),

    configuredGuilds:
      guildSettings.length,

    enabledGuilds:
      enabledSettings.length,

    postingTime:
      primarySchedule
        ?.postingTime ??
      null,

    timezone:
      primarySchedule
        ?.timezone ??
      null,

    lastAutomaticPostAt:
      lastPostDates.at(0)
        ?.toISOString() ??
      null,
  };
}

async function checkDiscordRestApi() {
  const startedAt =
    Date.now();

  try {
    const response = await fetch(
      "https://discord.com/api/v10/gateway",
      {
        signal:
          AbortSignal.timeout(
            10_000,
          ),
      },
    );

    const latencyMs =
      Date.now() -
      startedAt;

    return {
      reachable:
        response.ok,

      latencyMs,

      httpStatus:
        response.status,

      checkedAt:
        new Date()
          .toISOString(),
    };
  } catch (error) {
    return {
      reachable: false,

      latencyMs:
        Date.now() -
        startedAt,

      httpStatus: null,

      checkedAt:
        new Date()
          .toISOString(),

      error: String(
        error?.message ??
          error,
      ).slice(0, 300),
    };
  }
}

async function getOfficialDiscordStatus() {
  if (
    discordStatusCache &&
    Date.now() -
      discordStatusCachedAt <
      DISCORD_STATUS_CACHE_MS
  ) {
    return discordStatusCache;
  }

  try {
    const response = await fetch(
      "https://discordstatus.com/api/v2/summary.json",
      {
        signal:
          AbortSignal.timeout(
            10_000,
          ),
      },
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    const summary =
      await response.json();

    const findComponent = (
      name,
    ) =>
      summary.components?.find(
        (component) =>
          component.name
            ?.toLowerCase() ===
          name.toLowerCase(),
      );

    const activeIncidents =
      (
        summary.incidents ??
        []
      ).map((incident) => ({
        name:
          incident.name,

        status:
          incident.status,

        impact:
          incident.impact,

        startedAt:
          incident.started_at,

        updatedAt:
          incident.updated_at,
      }));

    discordStatusCache = {
      available: true,

      indicator:
        summary.status
          ?.indicator ??
        "unknown",

      description:
        summary.status
          ?.description ??
        "Unknown",

      apiStatus:
        findComponent("API")
          ?.status ??
        "unknown",

      gatewayStatus:
        findComponent("Gateway")
          ?.status ??
        "unknown",

      activeIncidents,

      checkedAt:
        new Date()
          .toISOString(),
    };

    discordStatusCachedAt =
      Date.now();

    return discordStatusCache;
  } catch (error) {
    return {
      available: false,

      indicator:
        "unknown",

      description:
        "Status unavailable",

      apiStatus:
        "unknown",

      gatewayStatus:
        "unknown",

      activeIncidents: [],

      checkedAt:
        new Date()
          .toISOString(),

      error: String(
        error?.message ??
          error,
      ).slice(0, 300),
    };
  }
}

async function getGitInformation() {
  if (
    gitCache &&
    Date.now() -
      gitCachedAt <
      GIT_CACHE_MS
  ) {
    return gitCache;
  }

  try {
    const [
      commit,
      branch,
      status,
    ] = await Promise.all([
      runCommand(
        "git",
        [
          "rev-parse",
          "--short",
          "HEAD",
        ],
      ),

      runCommand(
        "git",
        [
          "branch",
          "--show-current",
        ],
      ),

      runCommand(
        "git",
        [
          "status",
          "--porcelain",
        ],
      ),
    ]);

    let pm2Version =
      "unknown";

    try {
      pm2Version =
        await runCommand(
          "pm2",
          ["--version"],
        );
    } catch {
      // PM2 process checks will
      // report the larger problem.
    }

    gitCache = {
      available: true,
      commit,
      branch,
      clean:
        status.length === 0,
      pm2Version,
    };

    gitCachedAt =
      Date.now();

    return gitCache;
  } catch (error) {
    return {
      available: false,

      commit:
        "unknown",

      branch:
        "unknown",

      clean: null,

      pm2Version:
        "unknown",

      error: String(
        error?.message ??
          error,
      ).slice(0, 300),
    };
  }
}

async function collectSnapshot() {
  const [
    pm2,
    battery,
    storage,
    device,
    discordRest,
    officialDiscord,
    git,
  ] = await Promise.all([
    getPm2Information(),
    getBatteryInformation(),
    getStorageInformation(),
    getDeviceInformation(),
    checkDiscordRestApi(),
    getOfficialDiscordStatus(),
    getGitInformation(),
  ]);

  return {
    collectedAt:
      new Date()
        .toISOString(),

    application:
      getPackageInformation(),

    pm2,
    battery,
    storage,
    device,

    runtime:
      getRuntimeHealth(),

    scheduler:
      getSchedulerInformation(),

    discord: {
      rest:
        discordRest,

      official:
        officialDiscord,
    },

    git,
  };
}

module.exports = {
  collectSnapshot,
};