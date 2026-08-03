const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const settingsService = require(
  '../services/settingsService',
);

const dailyPostService = require(
  '../services/dailyPostService',
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-daily')
    .setDescription(
      'Preview this server’s daily Solace wellness post.',
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild,
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content:
          'This command can only be used inside a server.',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const storedSettings =
        settingsService.getGuildSettings(
          interaction.guild.id,
        );

      if (!storedSettings) {
        await interaction.editReply({
          content:
            'Solace has not been configured for this server yet. Run `/setup` first.',
        });

        return;
      }

      const settings = {
        ...storedSettings,
        guildId: interaction.guild.id,
      };

      const embed =
        dailyPostService.createDailyPost(
          settings,
          interaction.client.user,
          {
            trackHistory: false,
          },
        );

      await interaction.editReply({
        content:
          'Here is a preview of today’s daily wellness post:',
        embeds: [embed],
        allowedMentions: {
          parse: [],
        },
      });
    } catch (error) {
      console.error(
        'Failed to generate daily-post preview:',
        error,
      );

      await interaction.editReply({
        content:
          'Solace could not generate the daily-post preview. Check the bot console for details.',
      });
    }
  },
};