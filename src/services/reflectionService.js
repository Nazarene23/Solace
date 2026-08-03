const path = require('node:path');

const {
  loadContentPacks,
} = require('../utils/contentLoader');

const random = require('../utils/random');

const contentEngine = require(
  './contentEngine',
);

const reflections = loadContentPacks(
  path.join(__dirname, '../data/reflections'),
);

function getRandomReflection() {
  return random.pick(reflections);
}

function getNextReflection(
  guildId,
  trackHistory = true,
) {
  return contentEngine.getNextContent({
    guildId,
    type: 'reflections',
    items: reflections,
    trackHistory,
  });
}

module.exports = {
  getRandomReflection,
  getNextReflection,
};