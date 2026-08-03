const {
    SlashCommandBuilder,
    MessageFlags,
  } = require("discord.js");
  
  const embedBuilder = require(
    "../embeds/embedBuilder",
  );
  
  const RESOURCES = {
    grounding: {
      title: "🌿 Grounding",
      description: [
        "Try reconnecting with what is around you:",
        "",
        "• Notice five things you can see.",
        "• Notice four things you can feel.",
        "• Notice three things you can hear.",
        "• Notice two things you can smell.",
        "• Notice one thing you can taste.",
        "",
        "Move slowly. There is no need to rush through it.",
      ].join("\n"),
    },
  
    stress: {
      title: "🌤️ Managing Stress",
      description: [
        "When everything feels like too much, make the next step smaller:",
        "",
        "• Write down what is demanding your attention.",
        "• Choose one task that can realistically be handled now.",
        "• Pause for water, food, movement, or rest.",
        "• Ask someone trustworthy for support when you need it.",
        "",
        "You do not have to solve everything at once.",
      ].join("\n"),
    },
  
    sleep: {
      title: "🌙 Sleep and Rest",
      description: [
        "A few gentle habits may help you prepare for rest:",
        "",
        "• Keep your sleeping and waking times reasonably consistent.",
        "• Lower bright lights and screen activity before bed.",
        "• Make your room comfortable and quiet where possible.",
        "• Write down unfinished thoughts instead of carrying them to bed.",
        "",
        "Rest still matters, even when sleep does not come immediately.",
      ].join("\n"),
    },
  
    school: {
      title: "📚 School Wellbeing",
      description: [
        "School pressure can become exhausting. Try breaking it down:",
        "",
        "• Separate urgent work from work that can wait.",
        "• Study in short, focused sessions with real breaks.",
        "• Ask a teacher, counselor, classmate, or trusted adult for help.",
        "• Remember that one result does not define your ability or future.",
      ].join("\n"),
    },
  
    relationships: {
      title: "💙 Healthy Relationships",
      description: [
        "Healthy relationships should include:",
        "",
        "• Respect for boundaries",
        "• Honest and calm communication",
        "• Space for both people to be themselves",
        "• Accountability after mistakes",
        "• Freedom from pressure, threats, or control",
        "",
        "It is okay to step back and speak with someone trustworthy when a relationship feels unsafe or overwhelming.",
      ].join("\n"),
    },
  
    support: {
      title: "🫶 Find Immediate Support",
      description: [
        "Solace cannot provide emergency or professional care.",
        "",
        "If you or someone else may be in immediate danger, contact your local emergency services or a trusted adult nearby now.",
        "",
        "For verified support options based on your country:",
        "[Find A Helpline](https://findahelpline.com/)",
        "",
        "You can search by location and choose available phone, text, or chat services.",
      ].join("\n"),
    },
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("resources")
      .setDescription(
        "View private wellbeing resources and support options.",
      )
      .addStringOption((option) =>
        option
          .setName("topic")
          .setDescription(
            "Choose the type of support you want to view.",
          )
          .setRequired(true)
          .addChoices(
            {
              name: "Grounding",
              value: "grounding",
            },
            {
              name: "Managing stress",
              value: "stress",
            },
            {
              name: "Sleep and rest",
              value: "sleep",
            },
            {
              name: "School wellbeing",
              value: "school",
            },
            {
              name: "Healthy relationships",
              value: "relationships",
            },
            {
              name: "Find immediate support",
              value: "support",
            },
          ),
      ),
  
      async execute(interaction) {
        await interaction.deferReply({
          flags: MessageFlags.Ephemeral,
        });
      
        const topic =
          interaction.options.getString(
            "topic",
            true,
          );
      
        const resource = RESOURCES[topic];
      
        if (!resource) {
          await interaction.editReply({
            content:
              "That resource could not be found.",
          });
      
          return;
        }
      
        const embed = embedBuilder.create(
          resource.title,
          resource.description,
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