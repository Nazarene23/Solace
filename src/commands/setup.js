const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
  } = require("discord.js");
  
  const embedBuilder = require("../embeds/embedBuilder");
  const settingsService = require("../services/settingsService");
  
  const CONTENT_PRESETS = {
    all: {
      label: "Affirmation, Tip, Reflection",
      features: {
        affirmation: true,
        tip: true,
        reflection: true
      }
    },
  
    affirmation_tip: {
      label: "Affirmation and Tip",
      features: {
        affirmation: true,
        tip: true,
        reflection: false
      }
    },
  
    affirmation_reflection: {
      label: "Affirmation and Reflection",
      features: {
        affirmation: true,
        tip: false,
        reflection: true
      }
    },
  
    tip_reflection: {
      label: "Tip and Reflection",
      features: {
        affirmation: false,
        tip: true,
        reflection: true
      }
    },
  
    affirmation: {
      label: "Affirmation only",
      features: {
        affirmation: true,
        tip: false,
        reflection: false
      }
    },
  
    tip: {
      label: "Wellness Tip only",
      features: {
        affirmation: false,
        tip: true,
        reflection: false
      }
    },
  
    reflection: {
      label: "Reflection Prompt only",
      features: {
        affirmation: false,
        tip: false,
        reflection: true
      }
    }
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("setup")
      .setDescription("Configure Solace's daily wellness posts.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(
            "Choose where Solace should send daily wellness posts."
          )
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement
          )
          .setRequired(true)
      )
  
      .addStringOption((option) =>
        option
          .setName("timezone")
          .setDescription("Choose your server's timezone.")
          .setRequired(true)
          .addChoices(
            {
              name: "Philippines — Asia/Manila",
              value: "Asia/Manila"
            },
            {
              name: "United States Eastern — America/New_York",
              value: "America/New_York"
            },
            {
              name: "United States Central — America/Chicago",
              value: "America/Chicago"
            },
            {
              name: "United States Mountain — America/Denver",
              value: "America/Denver"
            },
            {
              name: "United States Pacific — America/Los_Angeles",
              value: "America/Los_Angeles"
            },
            {
              name: "United Kingdom — Europe/London",
              value: "Europe/London"
            },
            {
              name: "Central Europe — Europe/Berlin",
              value: "Europe/Berlin"
            },
            {
              name: "India — Asia/Kolkata",
              value: "Asia/Kolkata"
            },
            {
              name: "Japan — Asia/Tokyo",
              value: "Asia/Tokyo"
            },
            {
              name: "Australia Eastern — Australia/Sydney",
              value: "Australia/Sydney"
            },
            {
              name: "Coordinated Universal Time — UTC",
              value: "UTC"
            }
          )
      )
  
      .addStringOption((option) =>
        option
          .setName("time")
          .setDescription("Choose the daily posting time.")
          .setRequired(true)
          .addChoices(
            { name: "6:00 AM", value: "06:00" },
            { name: "7:00 AM", value: "07:00" },
            { name: "8:00 AM", value: "08:00" },
            { name: "9:00 AM", value: "09:00" },
            { name: "10:00 AM", value: "10:00" },
            { name: "12:00 PM", value: "12:00" },
            { name: "3:00 PM", value: "15:00" },
            { name: "6:00 PM", value: "18:00" },
            { name: "7:00 PM", value: "19:00" },
            { name: "8:00 PM", value: "20:00" },
            { name: "9:00 PM", value: "21:00" }
          )
      )
  
      .addStringOption((option) =>
        option
          .setName("content")
          .setDescription(
            "Choose what Solace should include in each daily post."
          )
          .setRequired(true)
          .addChoices(
            {
              name: "Affirmation + Tip + Reflection",
              value: "all"
            },
            {
              name: "Affirmation + Tip",
              value: "affirmation_tip"
            },
            {
              name: "Affirmation + Reflection",
              value: "affirmation_reflection"
            },
            {
              name: "Tip + Reflection",
              value: "tip_reflection"
            },
            {
              name: "Affirmation only",
              value: "affirmation"
            },
            {
              name: "Wellness Tip only",
              value: "tip"
            },
            {
              name: "Reflection Prompt only",
              value: "reflection"
            }
          )
      )
  
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription(
            "Optional opt-in role to mention with daily posts."
          )
          .setRequired(false)
      ),
  
    async execute(interaction) {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: "This command can only be used inside a server.",
          ephemeral: true
        });
  
        return;
      }
  
      await interaction.deferReply({
        ephemeral: true
      });
  
      const channel = interaction.options.getChannel(
        "channel",
        true
      );
  
      const timezone = interaction.options.getString(
        "timezone",
        true
      );
  
      const postingTime = interaction.options.getString(
        "time",
        true
      );
  
      const contentPresetKey =
        interaction.options.getString("content", true);
  
      const mentionRole =
        interaction.options.getRole("role", false);
  
      const contentPreset =
        CONTENT_PRESETS[contentPresetKey];
  
      if (!contentPreset) {
        await interaction.editReply({
          content:
            "That content preset is invalid. Please run `/setup` again."
        });
  
        return;
      }
  
      const botMember =
        interaction.guild.members.me;
  
      if (!botMember) {
        await interaction.editReply({
          content:
            "I couldn't check my server permissions. Please try again."
        });
  
        return;
      }
  
      const botPermissions =
        channel.permissionsFor(botMember);
  
      const requiredPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
      ];
  
      const missingPermissions =
        requiredPermissions.filter(
          (permission) =>
            !botPermissions?.has(permission)
        );
  
      if (missingPermissions.length > 0) {
        await interaction.editReply({
          content:
            `I cannot post in ${channel} yet.\n\n` +
            "Please give Solace these channel permissions:\n" +
            "• View Channel\n" +
            "• Send Messages\n" +
            "• Embed Links"
        });
  
        return;
      }
  
      if (mentionRole) {
        if (mentionRole.id === interaction.guild.id) {
          await interaction.editReply({
            content:
              "`@everyone` cannot be selected. Please use a dedicated opt-in role such as `@Daily Wellness`."
          });
  
          return;
        }
  
        if (mentionRole.managed) {
          await interaction.editReply({
            content:
              "That role is managed by Discord or another integration and cannot be used for wellness notifications."
          });
  
          return;
        }
  
        if (
          mentionRole.permissions.has(
            PermissionFlagsBits.Administrator
          )
        ) {
          await interaction.editReply({
            content:
              "Administrative roles cannot be used for daily wellness notifications. Please create an opt-in role such as `@Daily Wellness`."
          });
  
          return;
        }
  
        const canMentionRole =
          mentionRole.mentionable ||
          botMember.permissions.has(
            PermissionFlagsBits.MentionEveryone
          );
  
        if (!canMentionRole) {
          await interaction.editReply({
            content:
              `${mentionRole} is not mentionable.\n\n` +
              "Make the role mentionable in Server Settings, or choose no role."
          });
  
          return;
        }
      }
  
      const savedSettings =
        settingsService.saveGuildSettings(
          interaction.guild.id,
          {
            guildId: interaction.guild.id,
            channelId: channel.id,
            timezone,
            postingTime,
            enabled: true,
            mentionRoleId: mentionRole?.id ?? null,
            contentPreset: contentPresetKey,
            features: contentPreset.features,
            configuredBy: interaction.user.id
          }
        );
  
      const readableTime = formatTime(
        savedSettings.postingTime
      );
  
      const embed = embedBuilder.create(
        "🌱 Solace Setup Complete",
        [
          "Your server's daily wellness settings have been saved.",
          "",
          `**Channel:** ${channel}`,
          `**Timezone:** ${savedSettings.timezone}`,
          `**Daily post:** ${readableTime}`,
          `**Content:** ${contentPreset.label}`,
          `**Role to mention:** ${
            mentionRole ?? "None"
          }`,
          "",
          "Solace will use these settings when the daily scheduler is enabled."
        ].join("\n")
      );
  
      await interaction.editReply({
        embeds: [embed],
        allowedMentions: {
          parse: []
        }
      });
    }
  };
  
  function formatTime(time) {
    const [hoursText, minutes] =
      time.split(":");
  
    const hours = Number(hoursText);
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHours =
      hours % 12 || 12;
  
    return `${displayHours}:${minutes} ${suffix}`;
  }