const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  create(title, description, botUser = null) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.PRIMARY)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    embed.setFooter({
      text: 'Solace • by SomeoneListens',
      ...(botUser && {
        iconURL: botUser.displayAvatarURL({
          extension: 'png',
          size: 128,
        }),
      }),
    });

    return embed;
  },
};