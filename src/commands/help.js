const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const embedBuilder = require(
  "../embeds/embedBuilder",
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(
      "View Solace’s commands and features.",
    ),

  async execute(interaction) {
    const sections = [
      "**🌿 Wellness Commands**",
      "`/affirmation` — Receive a positive affirmation.",
      "`/breathe` — Follow a calming breathing exercise.",
      "`/check-in` — Take a private moment to check in with yourself.",
      "`/journal-prompt` — Receive a private reflection prompt.",
      "`/resources` — View private wellbeing resources and support options.",
      "",
      "**💙 Information**",
      "`/help` — View Solace’s commands and features.",
      "`/about` — Learn about Solace and SomeoneListens.",
      "`/status` — View Solace’s status and connection information.",
    ];

    const canManageServer =
      interaction.inGuild() &&
      interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageGuild,
      );

    if (canManageServer) {
      sections.push(
        "",
        "**⚙️ Server Management**",
        "`/setup` — Configure daily wellness posts.",
        "`/settings` — View the server’s current configuration.",
        "`/edit-settings` — Update the server’s configuration.",
        "`/test-daily` — Preview today’s daily wellness post.",
      );
    }

    sections.push(
      "",
      "More wellbeing tools are on the way. 🌱",
    );

    const embed = embedBuilder.create(
      "Solace Help",
      sections.join("\n"),
      interaction.client.user,
    );

    await interaction.reply({
      embeds: [embed],
      allowedMentions: {
        parse: [],
      },
    });
  },
};