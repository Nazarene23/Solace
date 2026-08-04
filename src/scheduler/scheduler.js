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
  runtimeHealthService
    .recordSchedulerCheck();

  const allSettings =
    settingsService.getAllGuildSettings();

  for (
    const [
      guildId,
      storedSettings,
    ] of Object.entries(allSettings)
  ) {
    try {
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

      const localTime =
        getLocalTime(
          settings.timezone,
        );

      if (!localTime) {
        console.warn(
          `[SCHEDULER] Invalid timezone for guild ${guildId}: ${settings.timezone}`,
        );

        continue;
      }

      const currentTime =
        `${localTime.hour}:${localTime.minute}`;

      if (
        currentTime !==
        settings.postingTime
      ) {
        continue;
      }

      if (
        settings.lastPostedDate ===
        localTime.date
      ) {
        continue;
      }

      await sendDailyPost(
        client,
        guildId,
        settings,
      );

      settingsService
        .updateGuildSettings(
          guildId,
          {
            lastPostedDate:
              localTime.date,

            lastPostedAt:
              new Date()
                .toISOString(),
          },
        );

      runtimeHealthService
        .recordDailyPostSuccess();
    } catch (error) {
      runtimeHealthService
        .recordDailyPostFailure(
          error,
        );

      console.error(
        `[SCHEDULER] Failed for guild ${guildId}:`,
        error,
      );
    }
  }
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
      if (
        part.type !== "literal"
      ) {
        values[part.type] =
          part.value;
      }
    }

    return {
      date:
        `${values.year}-${values.month}-${values.day}`,

      hour:
        values.hour,

      minute:
        values.minute,
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
    typeof channel.send !==
      "function"
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
    dailyPostService
      .createDailyPost(
        settings,
        client.user,
      );

  await channel.send({
    content:
      messageContent,

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