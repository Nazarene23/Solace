const {
    SlashCommandBuilder,
  } = require("discord.js");
  
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
          "*More tools and SomeoneListens integration are coming in the future.*",
        ].join("\n"),
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