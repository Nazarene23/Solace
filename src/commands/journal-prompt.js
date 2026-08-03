const {
    MessageFlags,
    SlashCommandBuilder,
  } = require("discord.js");
  
  const embedBuilder = require(
    "../embeds/embedBuilder",
  );
  
  const PROMPTS = {
    general: [
      "What has been taking up the most space in your mind lately?",
      "What is something you wish you could give yourself more time for?",
      "What part of today would you like to remember?",
      "What is one thing you need more of this week?",
      "What feels important to acknowledge right now?",
    ],
  
    gratitude: [
      "What is one small thing that made today a little better?",
      "Who is someone you appreciate, and what do you appreciate about them?",
      "What ordinary part of your life are you thankful to have?",
      "What is something kind someone has done for you recently?",
      "What place, activity, or memory helps you feel grounded?",
    ],
  
    growth: [
      "What is something you understand now that you did not understand a year ago?",
      "What challenge has taught you something useful about yourself?",
      "What is one skill or habit you would like to develop gently?",
      "What progress have you made that you rarely give yourself credit for?",
      "What would taking one small step forward look like today?",
    ],
  
    emotions: [
      "What emotion have you noticed most often today?",
      "If your current feelings could ask for something, what might they need?",
      "What usually helps you feel steadier during a difficult day?",
      "What feeling have you found difficult to put into words?",
      "Where could you give yourself a little more patience?",
    ],
  
    future: [
      "What would you like your future self to remember about this season of life?",
      "What is one experience you hope to have someday?",
      "What kind of person are you slowly becoming?",
      "What is one realistic thing you can do this week for your future self?",
      "How would you like your life to feel—not just look—in the future?",
    ],
  };
  
  function pickRandom(items) {
    return items[
      Math.floor(Math.random() * items.length)
    ];
  }
  
  function formatCategory(category) {
    const names = {
      general: "General Reflection",
      gratitude: "Gratitude",
      growth: "Personal Growth",
      emotions: "Understanding Emotions",
      future: "Future Self",
    };
  
    return names[category] ?? names.general;
  }
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("journal-prompt")
      .setDescription(
        "Receive a private reflection prompt.",
      )
      .addStringOption((option) =>
        option
          .setName("category")
          .setDescription(
            "Choose what you would like to reflect on.",
          )
          .setRequired(false)
          .addChoices(
            {
              name: "General reflection",
              value: "general",
            },
            {
              name: "Gratitude",
              value: "gratitude",
            },
            {
              name: "Personal growth",
              value: "growth",
            },
            {
              name: "Understanding emotions",
              value: "emotions",
            },
            {
              name: "Future self",
              value: "future",
            },
          ),
      ),
  
    async execute(interaction) {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });
  
      const category =
        interaction.options.getString(
          "category",
        ) ?? "general";
  
      const prompts =
        PROMPTS[category] ??
        PROMPTS.general;
  
      const prompt = pickRandom(prompts);
  
      const embed = embedBuilder.create(
        `📝 ${formatCategory(category)}`,
        [
          `> ${prompt}`,
          "",
          "Take your time. You can write privately, think quietly, or return to this prompt later.",
          "",
          "*Solace does not save your answer.*",
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