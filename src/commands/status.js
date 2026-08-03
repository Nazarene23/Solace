const {
  MessageFlags,
  SlashCommandBuilder,
} = require("discord.js");

const config = require(
  "../config/config",
);

const embedBuilder = require(
  "../embeds/embedBuilder",
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription(
      "View Solace’s current status and connection information.",
    ),

  async execute(interaction) {
    const responseStartedAt =
      Date.now();

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const responseLatency =
      Date.now() - responseStartedAt;

    const gatewayPing =
      interaction.client.ws.ping;

    const gatewayText =
      gatewayPing >= 0
        ? `${Math.round(gatewayPing)} ms`
        : "Connecting…";

    const uptime =
      formatUptime(
        interaction.client.uptime,
      );

    const embed = embedBuilder.create(
      "🌱 Solace Status",
      [
        "**Overall Status**",
        "🟢 Operational",
        "",
        "**Uptime**",
        uptime,
        "",
        "**Discord Gateway**",
        gatewayText,
        "",
        "**Command Response**",
        `${responseLatency} ms`,
        "",
        "**Version**",
        `v${config.bot.version}`,
      ].join("\n"),
      interaction.client.user,
    );

    await interaction.editReply({
      embeds: [embed],
      allowedMentions: {
        parse: [],
      },
    });
  },
};

function formatUptime(uptimeMilliseconds) {
  if (
    typeof uptimeMilliseconds !== "number"
  ) {
    return "Unavailable";
  }

  const totalSeconds =
    Math.floor(
      uptimeMilliseconds / 1000,
    );

  const days =
    Math.floor(
      totalSeconds / 86_400,
    );

  const hours =
    Math.floor(
      (totalSeconds % 86_400) /
      3_600,
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3_600) /
      60,
    );

  const seconds =
    totalSeconds % 60;

  const parts = [];

  if (days > 0) {
    parts.push(
      `${days}d`,
    );
  }

  if (
    hours > 0 ||
    days > 0
  ) {
    parts.push(
      `${hours}h`,
    );
  }

  if (
    minutes > 0 ||
    hours > 0 ||
    days > 0
  ) {
    parts.push(
      `${minutes}m`,
    );
  }

  parts.push(
    `${seconds}s`,
  );

  return parts.join(" ");
}