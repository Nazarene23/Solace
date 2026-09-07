const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require("discord.js");

const config = require("../config/config");
const embedBuilder = require("../embeds/embedBuilder");

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
        "It offers gentle tools for everyday emotional wellbeing, reflection, and moments of calm.",
        "",
        "**🌿 What Solace Offers**",
        "• Positive affirmations",
        "• Guided breathing exercises",
        "• Daily wellness posts",
        "• Reflection prompts and practical wellness tips",
        "• Helpful wellbeing resources",
        "",
        "**🫶 Our Purpose**",
        "Solace helps Discord communities encourage small moments of care through thoughtful, accessible wellness tools.",
        "",
        "**🌐 Official Support**",
        "Join the Solace Official Server for setup help, bug reports, service updates, and feedback.",
        "",
        "Solace is officially listed on **Top.gg**.",
        "",
        "**Important**",
        "Solace provides general wellbeing tools and information. It is not a therapist, medical provider, crisis service, or emergency service.",
      ].join("\n"),
      interaction.client.user,
    );

    const links = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Add Solace")
        .setStyle(ButtonStyle.Link)
        .setURL(config.support.install),

      new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL(config.support.discord),

      new ButtonBuilder()
        .setLabel("Top.gg")
        .setStyle(ButtonStyle.Link)
        .setURL(config.support.topgg),

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
