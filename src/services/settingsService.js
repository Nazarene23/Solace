const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(
  __dirname,
  "../data",
);

const settingsPath = path.join(
  dataDirectory,
  "guildSettings.json",
);

const backupPath = path.join(
  dataDirectory,
  "guildSettings.backup.json",
);

const temporaryPath = path.join(
  dataDirectory,
  "guildSettings.tmp.json",
);

function ensureDataDirectory() {
  fs.mkdirSync(
    dataDirectory,
    {
      recursive: true,
    },
  );
}

function parseSettingsFile(filePath) {
  const rawData = fs.readFileSync(
    filePath,
    "utf8",
  );

  if (!rawData.trim()) {
    throw new Error(
      "The settings file is empty.",
    );
  }

  const settings =
    JSON.parse(rawData);

  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings)
  ) {
    throw new Error(
      "The settings file must contain an object.",
    );
  }

  return settings;
}

function readSettings() {
  ensureDataDirectory();

  if (fs.existsSync(settingsPath)) {
    try {
      return parseSettingsFile(
        settingsPath,
      );
    } catch (error) {
      console.error(
        "Failed to read the main guild settings file:",
        error,
      );
    }
  }

  if (fs.existsSync(backupPath)) {
    try {
      const backupSettings =
        parseSettingsFile(
          backupPath,
        );

      console.warn(
        "Solace recovered guild settings from the automatic backup.",
      );

      return backupSettings;
    } catch (error) {
      console.error(
        "Failed to read the guild settings backup:",
        error,
      );
    }
  }

  console.warn(
    "No valid guild settings file was found. Using empty settings.",
  );

  return {};
}

function writeSettings(settings) {
  ensureDataDirectory();

  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings)
  ) {
    throw new TypeError(
      "Guild settings must be stored as an object.",
    );
  }

  const serializedSettings =
    JSON.stringify(
      settings,
      null,
      2,
    );

  try {
    fs.writeFileSync(
      temporaryPath,
      serializedSettings,
      "utf8",
    );

    if (fs.existsSync(settingsPath)) {
      try {
        parseSettingsFile(
          settingsPath,
        );

        fs.copyFileSync(
          settingsPath,
          backupPath,
        );
      } catch (backupError) {
        console.warn(
          "The current settings file was invalid and was not copied over the backup:",
          backupError,
        );
      }
    }

    fs.renameSync(
      temporaryPath,
      settingsPath,
    );
  } catch (error) {
    if (fs.existsSync(temporaryPath)) {
      try {
        fs.unlinkSync(
          temporaryPath,
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove the temporary settings file:",
          cleanupError,
        );
      }
    }

    console.error(
      "Failed to save guild settings:",
      error,
    );

    throw error;
  }
}

function getGuildSettings(guildId) {
  const settings = readSettings();

  return settings[guildId] ?? null;
}

function getAllGuildSettings() {
  return readSettings();
}

function saveGuildSettings(
  guildId,
  newSettings,
) {
  const settings = readSettings();

  settings[guildId] = {
    ...settings[guildId],
    ...newSettings,
    updatedAt:
      new Date().toISOString(),
  };

  writeSettings(settings);

  return settings[guildId];
}

function updateGuildSettings(
  guildId,
  updates,
) {
  const settings = readSettings();

  if (!settings[guildId]) {
    return null;
  }

  settings[guildId] = {
    ...settings[guildId],
    ...updates,
    updatedAt:
      new Date().toISOString(),
  };

  writeSettings(settings);

  return settings[guildId];
}

module.exports = {
  getGuildSettings,
  getAllGuildSettings,
  saveGuildSettings,
  updateGuildSettings,
};