require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  ApplicationIntegrationType,
  InteractionContextType,
  REST,
  Routes,
} = require('discord.js');

const deploymentTarget =
  process.argv[2] ?? 'guild';

if (!['guild', 'global'].includes(deploymentTarget)) {
  console.error(
    'Choose a deployment target: guild or global.',
  );

  process.exit(1);
}

const requiredEnv = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
];

if (deploymentTarget === 'guild') {
  requiredEnv.push('GUILD_ID');
}

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

  const commandData =
    command.data.toJSON();

  if (deploymentTarget === 'global') {
    commandData.integration_types = [
      ApplicationIntegrationType.GuildInstall,
    ];

    commandData.contexts = [
      InteractionContextType.Guild,
    ];
  }

  commands.push(commandData);

  console.log(`Loaded command for deployment: ${command.data.name}`);
}

const rest = new REST({
  version: '10',
}).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log(
      `Registering ${commands.length} ${deploymentTarget} command(s)...`,
    );

    const route =
      deploymentTarget === 'global'
        ? Routes.applicationCommands(
            process.env.CLIENT_ID,
          )
        : Routes.applicationGuildCommands(
            process.env.CLIENT_ID,
            process.env.GUILD_ID,
          );

    await rest.put(
      route,
      {
        body: commands,
      },
    );

    console.log(
      `${deploymentTarget === 'global' ? 'Global' : 'Guild'} commands registered successfully.`,
    );
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();
