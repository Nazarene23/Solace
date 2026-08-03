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
      logger.success(
        `${client.user.tag} is now online.`,
      );
  
      startScheduler(client);
    },
  };