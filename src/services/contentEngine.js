const settingsService = require(
  "./settingsService",
);

function getNextContent({
  guildId,
  type,
  items,
  trackHistory = true,
}) {
  if (!guildId) {
    throw new Error(
      "A guild ID is required.",
    );
  }

  if (!type) {
    throw new Error(
      "A content type is required.",
    );
  }

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      `No content is available for type: ${type}`,
    );
  }

  const validItems = items.filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      item.id.trim() &&
      typeof item.text === "string" &&
      item.text.trim(),
  );

  if (validItems.length === 0) {
    throw new Error(
      `No valid content entries exist for type: ${type}`,
    );
  }

  const settings =
    settingsService.getGuildSettings(
      guildId,
    );

  if (!settings) {
    throw new Error(
      `No Solace settings exist for guild ${guildId}.`,
    );
  }

  const contentHistory = {
    ...(settings.contentHistory ?? {}),
  };

  const validIds = new Set(
    validItems.map(
      (item) => item.id,
    ),
  );

  let usedIds = Array.isArray(
    contentHistory[type],
  )
    ? [
        ...new Set(
          contentHistory[type],
        ),
      ].filter(
        (id) =>
          typeof id === "string" &&
          validIds.has(id),
      )
    : [];

  let availableItems =
    validItems.filter(
      (item) =>
        !usedIds.includes(item.id),
    );

  if (availableItems.length === 0) {
    const previousId =
      usedIds.at(-1) ?? null;

    usedIds = [];

    availableItems =
      validItems.length > 1
        ? validItems.filter(
            (item) =>
              item.id !== previousId,
          )
        : validItems;
  }

  const selected =
    availableItems[
      Math.floor(
        Math.random() *
          availableItems.length,
      )
    ];

  if (trackHistory) {
    contentHistory[type] = [
      ...usedIds,
      selected.id,
    ];

    const updatedSettings =
      settingsService.updateGuildSettings(
        guildId,
        {
          contentHistory,
        },
      );

    if (!updatedSettings) {
      throw new Error(
        `Could not save content history for guild ${guildId}.`,
      );
    }
  }

  return selected;
}

module.exports = {
  getNextContent,
};