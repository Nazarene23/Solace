const settingsService = require('./settingsService');

function getNextContent({
  guildId,
  type,
  items,
  trackHistory = true,
}) {
  if (!guildId) {
    throw new Error('A guild ID is required.');
  }

  if (!type) {
    throw new Error('A content type is required.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      `No content is available for type: ${type}`,
    );
  }

  const validItems = items.filter(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.text === 'string',
  );

  if (validItems.length === 0) {
    throw new Error(
      `No valid content entries exist for type: ${type}`,
    );
  }

  const settings =
    settingsService.getGuildSettings(guildId);

  if (!settings) {
    throw new Error(
      `No Solace settings exist for guild ${guildId}.`,
    );
  }

  const contentHistory = {
    ...(settings.contentHistory ?? {}),
  };

  let usedIds = Array.isArray(
    contentHistory[type],
  )
    ? contentHistory[type]
    : [];

  const validIds = new Set(
    validItems.map((item) => item.id),
  );

  usedIds = usedIds.filter((id) =>
    validIds.has(id),
  );

  let availableItems = validItems.filter(
    (item) => !usedIds.includes(item.id),
  );

  // Every item has been used. Begin a fresh cycle.
  if (availableItems.length === 0) {
    usedIds = [];
    availableItems = validItems;
  }

  const selected =
    availableItems[
      Math.floor(
        Math.random() * availableItems.length,
      )
    ];

  if (trackHistory) {
    contentHistory[type] = [
      ...usedIds,
      selected.id,
    ];

    settingsService.updateGuildSettings(
      guildId,
      {
        contentHistory,
      },
    );
  }

  return selected;
}

module.exports = {
  getNextContent,
};