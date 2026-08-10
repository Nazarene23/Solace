const {
  PermissionFlagsBits,
} = require("discord.js");

const settingsService = require(
  "../services/settingsService",
);

const dailyPostService = require(
  "../services/dailyPostService",
);

const runtimeHealthService = require(
  "../services/runtimeHealthService",
);

const CHECK_INTERVAL_MS = 30_000;
const RETRY_DELAY_MS = 5 * 60_000;

const guildsInProgress = new Set();
const retryAfterByGuild = new Map();

let schedulerStarted = false;

function startScheduler(client) {
  if (schedulerStarted) {
    console.warn(
      "[SCHEDULER] Start ignored because the scheduler is already running.",
    );

    return;
  }

  schedulerStarted = true;

  console.log(
    "[SCHEDULER] Daily wellness scheduler started.",
  );

  void runSchedulerLoop(client);
}

async function runSchedulerLoop(client) {
  try {
    await checkScheduledPosts(client);
  } catch (error) {
    console.error(
      "[SCHEDULER] Scheduled check failed:",
      error,
    );
  } finally {
    setTimeout(() => {
      void runSchedulerLoop(client);
    }, CHECK_INTERVAL_MS);
  }
}

async function checkScheduledPosts(client) {
  runtimeHealthService.recordSchedulerCheck();

  const allSettings =
    settingsService.getAllGuildSettings();

  for (
    const [guildId, storedSettings]
    of Object.entries(allSettings)
  ) {
    const settings = {
      ...storedSettings,
      guildId,
    };

    if (!settings.enabled) {
      continue;
    }

    if (
      !settings.channelId ||
      !settings.timezone ||
      !settings.postingTime
    ) {
      console.warn(
        `[SCHEDULER] Incomplete settings for guild ${guildId}.`,
      );

      continue;
    }

    const localTime = getLocalTime(
      settings.timezone,
    );

    if (!localTime) {
      console.warn(
        `[SCHEDULER] Invalid timezone for guild ${guildId}: ${settings.timezone}`,
      );

      continue;
    }

    const scheduledMinutes =
      parseTimeToMinutes(
        settings.postingTime,
      );

    if (scheduledMinutes === null) {
      console.warn(
        `[SCHEDULER] Invalid posting time for guild ${guildId}: ${settings.postingTime}`,
      );

      continue;
    }

    const currentMinutes =
      Number(localTime.hour) * 60 +
      Number(localTime.minute);

    /*
     * Wait until today's configured posting time.
     *
     * If Solace was offline or had no internet at that
     * exact time, this condition remains true later in
     * the same day so the post can be delivered once
     * connectivity returns.
     */
    if (currentMinutes < scheduledMinutes) {
      continue;
    }

    /*
     * Never post more than once for the same local date.
     */
    if (
      settings.lastPostedDate ===
      localTime.date
    ) {
      continue;
    }

    /*
     * Prevent two scheduler checks from posting for the
     * same guild simultaneously.
     */
    if (guildsInProgress.has(guildId)) {
      continue;
    }

    /*
     * After a failed delivery, wait before trying again
     * instead of sending a request every 30 seconds.
     */
    const retryAfter =
      retryAfterByGuild.get(guildId);

    if (
      retryAfter &&
      Date.now() < retryAfter
    ) {
      continue;
    }

    const currentTime =
      `${localTime.hour}:${localTime.minute}`;

    const isCatchUp =
      currentMinutes > scheduledMinutes;

    guildsInProgress.add(guildId);

    try {
      if (isCatchUp) {
        console.log(
          `[SCHEDULER] Attempting catch-up post for guild ${guildId}. Scheduled for ${settings.postingTime}; current local time is ${currentTime}.`,
        );
      }

      await sendDailyPost(
        client,
        guildId,
        settings,
      );

      settingsService.updateGuildSettings(
        guildId,
        {
          lastPostedDate:
            localTime.date,

          lastPostedAt:
            new Date().toISOString(),
        },
      );

      retryAfterByGuild.delete(guildId);

      runtimeHealthService
        .recordDailyPostSuccess();
    } catch (error) {
      retryAfterByGuild.set(
        guildId,
        Date.now() + RETRY_DELAY_MS,
      );

      runtimeHealthService
        .recordDailyPostFailure(
          error,
        );

      console.error(
        `[SCHEDULER] Failed for guild ${guildId}. Retrying in ${RETRY_DELAY_MS / 60_000} minutes:`,
        error,
      );
    } finally {
      guildsInProgress.delete(guildId);
    }
  }
}

function parseTimeToMinutes(time) {
  if (
    typeof time !== "string" ||
    !/^\d{2}:\d{2}$/.test(time)
  ) {
    return null;
  }

  const [hourText, minuteText] =
    time.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function getLocalTime(timezone) {
  try {
    const formatter =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        },
      );

    const parts =
      formatter.formatToParts(
        new Date(),
      );

    const values = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] =
          part.value;
      }
    }

    return {
      date:
        `${values.year}-${values.month}-${values.day}`,

      hour: values.hour,
      minute: values.minute,
    };
  } catch (error) {
    console.error(
      `[SCHEDULER] Timezone error: ${timezone}`,
      error,
    );

    return null;
  }
}

async function sendDailyPost(
  client,
  guildId,
  settings,
) {
  const guild =
    await client.guilds.fetch(
      guildId,
    );

  const channel =
    await guild.channels.fetch(
      settings.channelId,
    );

  if (
    !channel ||
    !channel.isTextBased() ||
    typeof channel.send !== "function"
  ) {
    throw new Error(
      "Configured channel is unavailable or unsupported.",
    );
  }

  const botMember =
    guild.members.me ??
    (await guild.members.fetchMe());

  const permissions =
    channel.permissionsFor(
      botMember,
    );

  const canPost =
    permissions?.has(
      PermissionFlagsBits.ViewChannel,
    ) &&
    permissions?.has(
      PermissionFlagsBits.SendMessages,
    ) &&
    permissions?.has(
      PermissionFlagsBits.EmbedLinks,
    );

  if (!canPost) {
    throw new Error(
      "Solace is missing permission to post in the configured channel.",
    );
  }

  let messageContent =
    "Here's today's wellness moment.";

  let allowedMentions = {
    parse: [],
  };

  if (settings.mentionRoleId) {
    const mentionRole =
      await guild.roles
        .fetch(
          settings.mentionRoleId,
        )
        .catch(() => null);

    if (mentionRole) {
      messageContent =
        `<@&${mentionRole.id}> • ` +
        "Here's today's wellness moment.";

      allowedMentions = {
        parse: [],
        roles: [
          mentionRole.id,
        ],
        users: [],
        repliedUser: false,
      };
    }
  }

  const embed =
    dailyPostService.createDailyPost(
      settings,
      client.user,
    );

  await channel.send({
    content: messageContent,
    embeds: [
      embed,
    ],
    allowedMentions,
  });

  console.log(
    `[SCHEDULER] Daily post sent in guild ${guildId}.`,
  );
}

module.exports = {
  startScheduler,
};