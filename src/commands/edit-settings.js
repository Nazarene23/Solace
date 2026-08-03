const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
  } = require('discord.js');
  
  const settingsService = require(
    '../services/settingsService',
  );
  
  const embedBuilder = require(
    '../embeds/embedBuilder',
  );
  
  const CONTENT_PRESETS = {
    all: {
      label: 'Affirmation, Wellness Tip, Reflection Prompt',
      features: {
        affirmation: true,
        tip: true,
        reflection: true,
      },
    },
  
    affirmation_tip: {
      label: 'Affirmation and Wellness Tip',
      features: {
        affirmation: true,
        tip: true,
        reflection: false,
      },
    },
  
    affirmation_reflection: {
      label: 'Affirmation and Reflection Prompt',
      features: {
        affirmation: true,
        tip: false,
        reflection: true,
      },
    },
  
    tip_reflection: {
      label: 'Wellness Tip and Reflection Prompt',
      features: {
        affirmation: false,
        tip: true,
        reflection: true,
      },
    },
  
    affirmation: {
      label: 'Affirmation only',
      features: {
        affirmation: true,
        tip: false,
        reflection: false,
      },
    },
  
    tip: {
      label: 'Wellness Tip only',
      features: {
        affirmation: false,
        tip: true,
        reflection: false,
      },
    },
  
    reflection: {
      label: 'Reflection Prompt only',
      features: {
        affirmation: false,
        tip: false,
        reflection: true,
      },
    },
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('edit-settings')
      .setDescription(
        'Change this server’s Solace configuration.',
      )
      .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild,
      )
  
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription(
            'Change the daily wellness channel.',
          )
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
          )
          .setRequired(false),
      )
  
      .addStringOption((option) =>
        option
          .setName('timezone')
          .setDescription(
            'Change the server timezone.',
          )
          .addChoices(
            {
              name: 'Philippines — Asia/Manila',
              value: 'Asia/Manila',
            },
            {
              name: 'United States Eastern — America/New_York',
              value: 'America/New_York',
            },
            {
              name: 'United States Central — America/Chicago',
              value: 'America/Chicago',
            },
            {
              name: 'United States Mountain — America/Denver',
              value: 'America/Denver',
            },
            {
              name: 'United States Pacific — America/Los_Angeles',
              value: 'America/Los_Angeles',
            },
            {
              name: 'United Kingdom — Europe/London',
              value: 'Europe/London',
            },
            {
              name: 'Central Europe — Europe/Berlin',
              value: 'Europe/Berlin',
            },
            {
              name: 'India — Asia/Kolkata',
              value: 'Asia/Kolkata',
            },
            {
              name: 'Japan — Asia/Tokyo',
              value: 'Asia/Tokyo',
            },
            {
              name: 'Australia Eastern — Australia/Sydney',
              value: 'Australia/Sydney',
            },
            {
              name: 'UTC',
              value: 'UTC',
            },
          )
          .setRequired(false),
      )
  
      .addStringOption((option) =>
        option
          .setName('time')
          .setDescription(
            'Change the daily posting time.',
          )
          .addChoices(
            { name: '6:00 AM', value: '06:00' },
            { name: '7:00 AM', value: '07:00' },
            { name: '8:00 AM', value: '08:00' },
            { name: '9:00 AM', value: '09:00' },
            { name: '10:00 AM', value: '10:00' },
            { name: '12:00 PM', value: '12:00' },
            { name: '3:00 PM', value: '15:00' },
            { name: '6:00 PM', value: '18:00' },
            { name: '7:00 PM', value: '19:00' },
            { name: '7:30 PM', value: '19:30' },
            { name: '8:00 PM', value: '20:00' },
            { name: '9:00 PM', value: '21:00' },
          )
          .setRequired(false),
      )
  
      .addStringOption((option) =>
        option
          .setName('content')
          .setDescription(
            'Change the daily wellness content.',
          )
          .addChoices(
            {
              name: 'Affirmation + Tip + Reflection',
              value: 'all',
            },
            {
              name: 'Affirmation + Tip',
              value: 'affirmation_tip',
            },
            {
              name: 'Affirmation + Reflection',
              value: 'affirmation_reflection',
            },
            {
              name: 'Tip + Reflection',
              value: 'tip_reflection',
            },
            {
              name: 'Affirmation only',
              value: 'affirmation',
            },
            {
              name: 'Wellness Tip only',
              value: 'tip',
            },
            {
              name: 'Reflection Prompt only',
              value: 'reflection',
            },
          )
          .setRequired(false),
      )
  
      .addRoleOption((option) =>
        option
          .setName('role')
          .setDescription(
            'Change the notification role.',
          )
          .setRequired(false),
      )
  
      .addBooleanOption((option) =>
        option
          .setName('remove_role')
          .setDescription(
            'Remove the currently configured notification role.',
          )
          .setRequired(false),
      )
  
      .addBooleanOption((option) =>
        option
          .setName('enabled')
          .setDescription(
            'Enable or disable automatic daily posts.',
          )
          .setRequired(false),
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
  
      const currentSettings =
        settingsService.getGuildSettings(
          interaction.guild.id,
        );
  
      if (!currentSettings) {
        await interaction.editReply({
          content:
            'Solace has not been configured yet. Run `/setup` first.',
        });
  
        return;
      }
  
      const channel =
        interaction.options.getChannel('channel');
  
      const timezone =
        interaction.options.getString('timezone');
  
      const postingTime =
        interaction.options.getString('time');
  
      const contentPresetKey =
        interaction.options.getString('content');
  
      const mentionRole =
        interaction.options.getRole('role');
  
      const removeRole =
        interaction.options.getBoolean(
          'remove_role',
        );
  
      const enabled =
        interaction.options.getBoolean('enabled');
  
      const nothingSelected =
        !channel &&
        !timezone &&
        !postingTime &&
        !contentPresetKey &&
        !mentionRole &&
        removeRole === null &&
        enabled === null;
  
      if (nothingSelected) {
        await interaction.editReply({
          content:
            'Choose at least one setting to change.',
        });
  
        return;
      }
  
      if (mentionRole && removeRole === true) {
        await interaction.editReply({
          content:
            'Choose either a new role or `remove_role: True`, not both.',
        });
  
        return;
      }
  
      const botMember =
        interaction.guild.members.me;
  
      if (!botMember) {
        await interaction.editReply({
          content:
            'I could not check my server permissions. Please try again.',
        });
  
        return;
      }
  
      if (channel) {
        const permissions =
          channel.permissionsFor(botMember);
  
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
          await interaction.editReply({
            content:
              `I cannot post in ${channel}.\n\n` +
              'Please give Solace these permissions:\n' +
              '• View Channel\n' +
              '• Send Messages\n' +
              '• Embed Links',
          });
  
          return;
        }
      }
  
      if (mentionRole) {
        if (mentionRole.id === interaction.guild.id) {
          await interaction.editReply({
            content:
              '`@everyone` cannot be used as the notification role.',
          });
  
          return;
        }
  
        if (mentionRole.managed) {
          await interaction.editReply({
            content:
              'That role is controlled by Discord or another integration and cannot be selected.',
          });
  
          return;
        }
  
        if (
          mentionRole.permissions.has(
            PermissionFlagsBits.Administrator,
          )
        ) {
          await interaction.editReply({
            content:
              'Administrative roles cannot be used for wellness notifications.',
          });
  
          return;
        }
  
        const canMention =
          mentionRole.mentionable ||
          botMember.permissions.has(
            PermissionFlagsBits.MentionEveryone,
          );
  
        if (!canMention) {
          await interaction.editReply({
            content:
              `${mentionRole} is not mentionable. Make it mentionable in Server Settings or choose another role.`,
          });
  
          return;
        }
      }
  
      const updates = {};
  
      if (channel) {
        updates.channelId = channel.id;
      }
  
      if (timezone) {
        updates.timezone = timezone;
      }
  
      if (postingTime) {
        updates.postingTime = postingTime;
      }
  
      if (contentPresetKey) {
        const preset =
          CONTENT_PRESETS[contentPresetKey];
  
        if (!preset) {
          await interaction.editReply({
            content:
              'The selected content preset is invalid.',
          });
  
          return;
        }
  
        updates.contentPreset =
          contentPresetKey;
  
        updates.features =
          preset.features;
      }
  
      if (mentionRole) {
        updates.mentionRoleId =
          mentionRole.id;
      }
  
      if (removeRole === true) {
        updates.mentionRoleId = null;
      }
  
      if (enabled !== null) {
        updates.enabled = enabled;
      }
  
      updates.configuredBy =
        interaction.user.id;
  
      const savedSettings =
        settingsService.updateGuildSettings(
          interaction.guild.id,
          updates,
        );
  
      if (!savedSettings) {
        await interaction.editReply({
          content:
            'I could not update the server settings.',
        });
  
        return;
      }
  
      const enabledContent = [];
  
      if (savedSettings.features?.affirmation) {
        enabledContent.push('Affirmation');
      }
  
      if (savedSettings.features?.tip) {
        enabledContent.push('Wellness Tip');
      }
  
      if (savedSettings.features?.reflection) {
        enabledContent.push(
          'Reflection Prompt',
        );
      }
  
      const embed = embedBuilder.create(
        'Settings Updated',
        [
          'The Solace configuration has been updated.',
          '',
          '**Channel**',
          `<#${savedSettings.channelId}>`,
          '',
          '**Timezone**',
          savedSettings.timezone,
          '',
          '**Daily Post**',
          formatTime(
            savedSettings.postingTime,
          ),
          '',
          '**Content**',
          enabledContent.join(', ') || 'None',
          '',
          '**Role Mention**',
          savedSettings.mentionRoleId
            ? `<@&${savedSettings.mentionRoleId}>`
            : 'None',
          '',
          '**Status**',
          savedSettings.enabled
            ? 'Enabled'
            : 'Disabled',
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