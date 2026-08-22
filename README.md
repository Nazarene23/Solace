# Solace

![Solace banner](src/assets/icons/banner.png)

**Solace** is a privacy-conscious Discord wellness companion created by **SomeoneListens**.

It provides gentle tools for everyday reflection, calm, and wellbeing while giving server managers control over scheduled daily wellness posts.

> Solace is currently under active development and is not yet publicly released.

Current release stage: private release candidate.

## Features

### Member tools

- `/affirmation` — Receive a positive affirmation

- `/breathe` — Follow a guided breathing exercise

- `/check-in` — Complete a private mood check-in

- `/journal-prompt` — Receive a private reflection prompt

- `/resources` — View private wellbeing resources

- `/about` — Learn about Solace and SomeoneListens

- `/help` — View available commands

- `/status` — View connection and uptime information

### Server management

These commands require the **Manage Server** permission:

- `/setup` — Configure daily wellness posts

- `/settings` — View the current configuration

- `/edit-settings` — Update the configuration

- `/test-daily` — Preview a daily wellness post

## Privacy

- Check-in selections are not saved.

- Journal responses are not requested or stored.

- Resource selections are private.

- Server configuration is stored locally and excluded from Git.

- Secrets and Discord tokens must remain inside `.env`.

## Requirements

- Node.js 20 or newer

- A Discord application and bot

- A Discord development server

## Local setup

1. Install dependencies:

```powershell

npm install

```

2. Copy the environment template:

```powershell

Copy-Item .env.example .env

```

3. Add the required values to `.env`:

```env

DISCORD_TOKEN=

CLIENT_ID=

GUILD_ID=

```

Never commit or share the completed `.env` file.

4. Deploy commands to the development server:

```powershell

npm run deploy

```

5. Start Solace:

```powershell

npm start

```

## Deployment targets

- `npm run deploy:guild` updates commands in the configured development server immediately.
- `npm run deploy:global` publishes guild-only commands for every server that installs Solace.
- `npm run validate:release` checks command definitions and required release files before deployment.

Do not run the global deployment command until the release candidate has passed testing in trusted servers.

## Data safety

Guild settings are written atomically and protected by an automatic backup. Runtime configuration files and backups inside `src/data` are excluded from Git.

## Important notice

Solace provides general wellbeing tools and information. It is not a therapist, medical provider, or emergency service.

Read the [Privacy Policy](PRIVACY.md), [Terms of Service](TERMS.md), and [release checklist](RELEASE_CHECKLIST.md).

## Support

For setup help, bug reports, and service updates, join the [SomeoneListens support server](https://discord.gg/Y5tM2vHdzw).

Please do not share Discord tokens, passwords, personal records, or private wellbeing information in support requests.

## Development status

Solace v1 is currently in testing and stabilization. Permanent 24/7 hosting will begin only after the stability and release-readiness checks are complete.

## License

Licensed under the MIT License.

---

Created by **SomeoneListens**
