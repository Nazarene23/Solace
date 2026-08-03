require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  REST,
  Routes,
} = require('discord.js');

const requiredEnv = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const commands = [];

const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command.data || !command.execute) {
    console.warn(`Skipping invalid command file: ${file}`);
    continue;
  }

  commands.push(command.data.toJSON());

  console.log(`Loaded command for deployment: ${command.data.name}`);
}

const rest = new REST({
  version: '10',
}).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log(
      `Registering ${commands.length} guild command(s)...`,
    );

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      {
        body: commands,
      },
    );

    console.log('Guild commands registered successfully.');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();