# Solace Release Checklist

## Before deployment

- Run `npm ci`.
- Run `npm run validate:content`.
- Run `npm run validate:release`.
- Run `git diff --check` and confirm `git status --short` is empty.
- Confirm `.env` contains the correct production token and application ID.
- Back up `src/data/guildSettings.json` and monitoring state from the host phone.

## Discord Developer Portal

- Set the application description, icon, Terms URL, and Privacy Policy URL.
- Enable Guild Install only.
- Choose the Discord Provided Install Link.
- For Guild Install, select the `applications.commands` and `bot` scopes.
- Request only View Channels, Send Messages, and Embed Links by default.
- Do not request Administrator.
- Keep privileged intents disabled; Solace does not require them.

## Release candidate

- Deploy commands to the test server with `npm run deploy:guild`.
- Test every member command.
- Test every management command with and without Manage Server permission.
- Test setup in a second trusted server.
- Confirm private commands are ephemeral.
- Confirm role mentions only target the configured role.
- Confirm removing Solace deletes that server's stored configuration.

## Public command deployment

- Run `npm run deploy:global` once from the trusted PC.
- Confirm global commands appear in the private-beta servers.
- Keep the test guild deployment available for rapid development updates.

## Phone update

- Back up runtime JSON files.
- Run `git pull --ff-only`.
- Run both validation commands.
- Restart `solace`, wait until ready, then restart `solace-monitor`.
- Run `pm2 save` only after both processes remain online.
- Test `/status`, `/resources`, `/setup`, and Telegram `/status`.

## Rollback

- Record the last known-good commit before updating.
- If the release fails, return to that commit through a new Git revert commit, restore runtime backups if needed, restart both PM2 processes, and save the process list again.
