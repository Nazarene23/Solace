const {
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "interactionCreate",

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const receivedAfter =
      Date.now() - interaction.createdTimestamp;

    console.log(
      `[INTERACTION] /${interaction.commandName} received after ${receivedAfter}ms | Gateway ping: ${interaction.client.ws.ping}ms | ID: ${interaction.id}`,
    );

    const command =
      interaction.client.commands.get(
        interaction.commandName,
      );

    if (!command) {
      console.warn(
        `No command handler found for /${interaction.commandName}.`,
      );

      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      if (error.code === 10062) {
        const expiredAfter =
          Date.now() -
          interaction.createdTimestamp;

        console.warn(
          `[INTERACTION EXPIRED] /${interaction.commandName} failed after ${expiredAfter}ms. Discord no longer accepted the interaction.`,
        );

        return;
      }

      console.error(
        `Error while running /${interaction.commandName}:`,
        error,
      );

      try {
        const content =
          "Something went wrong while running that command.";

        if (interaction.deferred) {
          await interaction.editReply({
            content,
            embeds: [],
            components: [],
          });

          return;
        }

        if (interaction.replied) {
          await interaction.followUp({
            content,
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        await interaction.reply({
          content,
          flags: MessageFlags.Ephemeral,
        });
      } catch (responseError) {
        console.error(
          `Could not send the error response for /${interaction.commandName}:`,
          responseError,
        );
      }
    }
  },
};