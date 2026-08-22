  const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
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
      .setName("about")
      .setDescription(
        "Learn about Solace and SomeoneListens.",
      ),
  
    async execute(interaction) {
      const embed = embedBuilder.create(
        "💙 About Solace",
        [
          "Solace is a wellness-focused Discord bot created by **SomeoneListens**.",
          "",
          "It provides gentle tools designed to support everyday emotional wellbeing, reflection, and moments of calm.",
          "",
          "**🌿 What Solace Offers**",
          "• Positive affirmations",
          "• Guided breathing exercises",
          "• Daily wellness posts",
          "• Reflection prompts and practical wellness tips",
          "",
          "**🫶 Our Purpose**",
          "Everyone deserves a space where they feel heard, respected, and supported.",
          "",
          "**Important**",
          "Solace provides general wellbeing support. It is not a therapist, medical service, or emergency service.",
          "",
          "Use the buttons below for technical support, privacy information, and service terms.",
        ].join("\n"),
        interaction.client.user,
      );

      const links =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Support Server")
            .setStyle(ButtonStyle.Link)
            .setURL(config.support.discord),

          new ButtonBuilder()
            .setLabel("Privacy")
            .setStyle(ButtonStyle.Link)
            .setURL(config.support.privacy),

          new ButtonBuilder()
            .setLabel("Terms")
            .setStyle(ButtonStyle.Link)
            .setURL(config.support.terms),
        );
  
      await interaction.reply({
        embeds: [embed],
        components: [links],
        allowedMentions: {
          parse: [],
        },
      });
    },
  };
