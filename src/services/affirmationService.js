const path = require('node:path');

const {
  loadContentPacks,
} = require('../utils/contentLoader');

const random = require('../utils/random');

const contentEngine = require(
  './contentEngine',
);

const affirmations = loadContentPacks(
  path.join(__dirname, '../data/affirmations'),
);

function getRandomAffirmation() {
  return random.pick(affirmations);
}

function getNextAffirmation(
  guildId,
  trackHistory = true,
) {
  return contentEngine.getNextContent({
    guildId,
    type: 'affirmations',
    items: affirmations,
    trackHistory,
  });
}

module.exports = {
  getRandomAffirmation,
  getNextAffirmation,
};