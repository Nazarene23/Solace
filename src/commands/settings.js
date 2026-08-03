const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
  } = require('discord.js');
  
  const settingsService = require(
    '../services/settingsService',
  );
  
  const embedBuilder = require(
    '../embeds/embedBuilder',
  );
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('settings')
      .setDescription(
        'View this server’s current Solace configuration.',
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
  
      const settings =
        settingsService.getGuildSettings(
          interaction.guild.id,
        );
  
      if (!settings) {
        await interaction.editReply({
          content:
            'Solace has not been configured for this server yet. Run `/setup` first.',
        });
  
        return;
      }
  
      let channelText =
        `<#${settings.channelId}>`;
  
      let roleText = 'None';
  
      if (settings.mentionRoleId) {
        roleText =
          `<@&${settings.mentionRoleId}>`;
      }
  
      const enabledContent = [];
  
      if (settings.features?.affirmation) {
        enabledContent.push('Affirmation');
      }
  
      if (settings.features?.tip) {
        enabledContent.push('Wellness Tip');
      }
  
      if (settings.features?.reflection) {
        enabledContent.push('Reflection Prompt');
      }
  
      const readableTime = formatTime(
        settings.postingTime,
      );
  
      const statusText = settings.enabled
        ? 'Enabled'
        : 'Disabled';
  
      const lastPostedText =
        settings.lastPostedAt
          ? formatDate(settings.lastPostedAt)
          : 'Not posted yet';
  
      const embed = embedBuilder.create(
        'Solace Settings',
        [
          '**Channel**',
          channelText,
          '',
          '**Timezone**',
          settings.timezone,
          '',
          '**Daily Post**',
          readableTime,
          '',
          '**Content**',
          enabledContent.length > 0
            ? enabledContent.join(', ')
            : 'None',
          '',
          '**Role Mention**',
          roleText,
          '',
          '**Status**',
          statusText,
          '',
          '**Last Automatic Post**',
          lastPostedText,
        ].join('\n'),
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
  
  function formatTime(time) {
    if (!time) {
      return 'Not configured';
    }
  
    const [hourText, minute] =
      time.split(':');
  
    const hour = Number(hourText);
    const suffix =
      hour >= 12 ? 'PM' : 'AM';
  
    const displayHour =
      hour % 12 || 12;
  
    return `${displayHour}:${minute} ${suffix}`;
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
  
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }
  
    return date.toLocaleString();
  }