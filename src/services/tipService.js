const path = require('node:path');

const {
  loadContentPacks,
} = require('../utils/contentLoader');

const random = require('../utils/random');

const contentEngine = require(
  './contentEngine',
);

const wellnessTips = loadContentPacks(
  path.join(__dirname, '../data/tips'),
);

function getRandomTip() {
  return random.pick(wellnessTips);
}

function getNextTip(
  guildId,
  trackHistory = true,
) {
  return contentEngine.getNextContent({
    guildId,
    type: 'tips',
    items: wellnessTips,
    trackHistory,
  });
}

module.exports = {
  getRandomTip,
  getNextTip,
};