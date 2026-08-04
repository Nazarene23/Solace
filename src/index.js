require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  GatewayIntentBits,
} = require('discord.js');

const runtimeHealthService = require(
  './services/runtimeHealthService',
);

const requiredEnv = [
  'DISCORD_TOKEN',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(
      `Missing required environment variable: ${key}`,
    );

    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],

  allowedMentions: {
    parse: [],
  },
});

client.commands = new Collection();

/*
 * Load slash commands
 */
const commandsPath = path.join(
  __dirname,
  'commands',
);

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(
    (file) =>
      file.endsWith('.js'),
  );

for (const file of commandFiles) {
  const filePath = path.join(
    commandsPath,
    file,
  );

  const command =
    require(filePath);

  if (
    !command.data ||
    !command.execute
  ) {
    console.warn(
      `Skipping invalid command file: ${file}`,
    );

    continue;
  }

  client.commands.set(
    command.data.name,
    command,
  );

  console.log(
    `Loaded command: ${command.data.name}`,
  );
}

/*
 * Load events
 */
const eventsPath = path.join(
  __dirname,
  'events',
);

const eventFiles = fs
  .readdirSync(eventsPath)
  .filter(
    (file) =>
      file.endsWith('.js'),
  );

for (const file of eventFiles) {
  const filePath = path.join(
    eventsPath,
    file,
  );

  const event =
    require(filePath);

  if (
    !event.name ||
    !event.execute
  ) {
    console.warn(
      `Skipping invalid event file: ${file}`,
    );

    continue;
  }

  if (event.once) {
    client.once(
      event.name,
      (...args) =>
        event.execute(...args),
    );
  } else {
    client.on(
      event.name,
      (...args) =>
        event.execute(...args),
    );
  }

  console.log(
    `Loaded event: ${event.name}`,
  );
}

/*
 * Start private runtime health reporting
 * before connecting to Discord.
 */
runtimeHealthService.start(
  client,
);

client
  .login(
    process.env.DISCORD_TOKEN,
  )
  .catch((error) => {
    console.error(
      '[LOGIN] Solace could not connect to Discord:',
      error,
    );

    /*
     * PM2 will restart Solace after
     * a failed initial connection.
     */
    process.exit(1);
  });