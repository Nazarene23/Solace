const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SlashCommandBuilder,
  } = require("discord.js");
  
  const embedBuilder = require(
    "../embeds/embedBuilder",
  );
  
  const MOODS = {
    great: {
      title: "😊 Feeling Great",
      message: [
        "It is good to hear that today is treating you well.",
        "",
        "Take a moment to notice what helped. Remembering those small things can make them easier to return to later.",
      ].join("\n"),
    },
  
    good: {
      title: "🙂 Feeling Good",
      message: [
        "That is worth appreciating.",
        "",
        "Consider doing one small thing that helps carry this steady feeling through the rest of your day.",
      ].join("\n"),
    },
  
    okay: {
      title: "😐 Feeling Okay",
      message: [
        "Okay is a completely valid place to be.",
        "",
        "You do not have to force yourself to feel differently. A short pause, some water, or a little movement may help you reset.",
      ].join("\n"),
    },
  
    low: {
      title: "😟 Feeling Low",
      message: [
        "Thank you for taking a moment to check in.",
        "",
        "Try making the next step small: breathe slowly, get some water, or use `/resources topic:Grounding`.",
        "",
        "You can also reach out to someone you trust when you want support.",
      ].join("\n"),
    },
  
    struggling: {
      title: "😢 Having a Hard Time",
      message: [
        "You do not have to handle a difficult moment entirely by yourself.",
        "",
        "Consider contacting a trusted person nearby and letting them know that you could use some support.",
        "",
        "Use `/resources topic:Find immediate support` to view verified support options for your location.",
        "",
        "If you or someone else may be in immediate danger, contact local emergency services or a trusted adult nearby.",
      ].join("\n"),
    },
  };
  
  function createMoodButtons(disabled = false) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("check_in_great")
        .setLabel("Great")
        .setEmoji("😊")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
  
      new ButtonBuilder()
        .setCustomId("check_in_good")
        .setLabel("Good")
        .setEmoji("🙂")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
  
      new ButtonBuilder()
        .setCustomId("check_in_okay")
        .setLabel("Okay")
        .setEmoji("😐")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
  
      new ButtonBuilder()
        .setCustomId("check_in_low")
        .setLabel("Low")
        .setEmoji("😟")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
  
      new ButtonBuilder()
        .setCustomId("check_in_struggling")
        .setLabel("Hard Time")
        .setEmoji("😢")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    );
  }
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("check-in")
      .setDescription(
        "Take a private moment to check in with yourself.",
      ),
  
    async execute(interaction) {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });
  
      const promptEmbed = embedBuilder.create(
        "💙 How Are You Feeling?",
        [
          "Choose the option that feels closest to how you are doing right now.",
          "",
          "There is no wrong answer, and Solace will not save this check-in.",
        ].join("\n"),
        interaction.client.user,
      );
  
      const response =
        await interaction.editReply({
          embeds: [promptEmbed],
          components: [
            createMoodButtons(),
          ],
        });
  
      try {
        const buttonInteraction =
          await response.awaitMessageComponent({
            filter: (button) =>
              button.user.id ===
              interaction.user.id,
            time: 60_000,
          });
  
        const moodKey =
          buttonInteraction.customId.replace(
            "check_in_",
            "",
          );
  
        const mood = MOODS[moodKey];
  
        if (!mood) {
          await buttonInteraction.update({
            content:
              "That check-in option could not be found.",
            embeds: [],
            components: [],
          });
  
          return;
        }
  
        const resultEmbed =
          embedBuilder.create(
            mood.title,
            mood.message,
            interaction.client.user,
          );
  
        await buttonInteraction.update({
          embeds: [resultEmbed],
          components: [],
        });
      } catch (error) {
        await interaction.editReply({
          content:
            "This check-in expired. Run `/check-in` whenever you would like to try again.",
          embeds: [],
          components: [],
        });
      }
    },
  };