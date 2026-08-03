const { SlashCommandBuilder } = require("discord.js");

const embedBuilder = require("../embeds/embedBuilder");
const affirmationService = require("../services/affirmationService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("affirmation")
    .setDescription("Receive a positive affirmation."),

  async execute(interaction) {
    const affirmation = affirmationService.getRandomAffirmation();

    const embed = embedBuilder.create(
      "🌱 Today's Affirmation",
      `> ${affirmation.text}\n\n💙 Remember to be kind to yourself today.`,
      interaction.client.user,
    );

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] }
    });
  }
};