const {
    SlashCommandBuilder,
    MessageFlags,
  } = require('discord.js');
  
  const breathingService = require(
    '../services/breathingService',
  );
  
  const embedBuilder = require(
    '../embeds/embedBuilder',
  );
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('breathe')
      .setDescription(
        'Try a short, gentle breathing exercise.',
      )
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription(
            'Choose the kind of breathing exercise.',
          )
          .setRequired(true)
          .addChoices(
            {
              name: 'Calm',
              value: 'calm',
            },
            {
              name: 'Focus',
              value: 'focus',
            },
            {
              name: 'Quick Reset',
              value: 'reset',
            },
          ),
      ),
  
    async execute(interaction) {
      const type =
        interaction.options.getString(
          'type',
          true,
        );
  
      const exercise =
        breathingService.getBreathingExercise(
          type,
        );
  
      const steps = exercise.steps
        .map(
          (step, index) =>
            `**${index + 1}.** ${step}`,
        )
        .join('\n\n');
  
      const description = [
        'Move at a comfortable pace. Do not force or strain your breathing.',
        '',
        steps,
        '',
        `*${exercise.closing}*`,
        '',
        'Stop and return to your normal breathing if you feel uncomfortable or lightheaded.',
      ].join('\n');
  
      const embed = embedBuilder.create(
        `🫁 ${exercise.title}`,
        description,
        interaction.client.user,
      );
  
      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
        allowedMentions: {
          parse: [],
        },
      });
    },
  };