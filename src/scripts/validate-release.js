const fs = require("node:fs");
const path = require("node:path");
const {
  execFileSync,
} = require("node:child_process");

const projectRoot = path.join(
  __dirname,
  "../..",
);

const commandsPath = path.join(
  projectRoot,
  "src/commands",
);

const failures = [];
const commandNames = new Set();

for (const file of fs.readdirSync(commandsPath)) {
  if (!file.endsWith(".js")) {
    continue;
  }

  try {
    const command = require(
      path.join(commandsPath, file),
    );

    if (!command.data || typeof command.execute !== "function") {
      failures.push(`${file}: missing data or execute()`);
      continue;
    }

    const json = command.data.toJSON();

    if (commandNames.has(json.name)) {
      failures.push(`${file}: duplicate command name ${json.name}`);
    }

    commandNames.add(json.name);
  } catch (error) {
    failures.push(`${file}: ${error.message}`);
  }
}

const requiredFiles = [
  "README.md",
  "LICENSE",
  "PRIVACY.md",
  "TERMS.md",
  ".env.example",
  ".gitignore",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(projectRoot, file))) {
    failures.push(`Missing required release file: ${file}`);
  }
}

const forbiddenTrackedPaths = new Set([
  ".env",
  "src/data/guildSettings.json",
  "src/data/guildSettings.backup.json",
  "src/data/guildSettings.manual-backup.json",
  "src/data/guildSettings.tmp.json",
  "src/data/monitorState.json",
  "src/data/monitorHistory.json",
  "src/data/runtimeHealth.json",
]);

try {
  const trackedFiles = execFileSync(
    "git",
    ["ls-files"],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));

  for (const file of trackedFiles) {
    if (forbiddenTrackedPaths.has(file)) {
      failures.push(
        `Private runtime file is tracked by Git: ${file}`,
      );
    }
  }
} catch (error) {
  failures.push(
    `Could not inspect Git's tracked files: ${error.message}`,
  );
}

if (failures.length > 0) {
  console.error("Solace release validation failed:\n");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  `Solace release validation passed: ${commandNames.size} commands and all required release files are present.`,
);
