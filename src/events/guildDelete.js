const settingsService = require(
  "../services/settingsService",
);

module.exports = {
  name: "guildDelete",

  execute(guild) {
    try {
      const removed =
        settingsService.deleteGuildSettings(
          guild.id,
        );

      if (removed) {
        console.log(
          `[GUILD] Removed stored settings after leaving guild ${guild.id}.`,
        );
      }
    } catch (error) {
      console.error(
        `[GUILD] Could not remove settings for guild ${guild.id}:`,
        error,
      );
    }
  },
};
