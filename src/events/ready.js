const {
  ActivityType,
} = require('discord.js');

const logger = require(
  '../utils/logger',
);

const {
  startScheduler,
} = require(
  '../scheduler/scheduler',
);

module.exports = {
  name: 'clientReady',
  once: true,

  execute(client) {
    client.user.setPresence({
      activities: [
        {
          name: 'Solace',
          type: ActivityType.Custom,
          state: 'Supporting your wellbeing 🌿',
        },
      ],

      status: 'online',
    });

    logger.success(
      `${client.user.tag} is now online.`,
    );

    startScheduler(client);
  },
};