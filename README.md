# Telegram MCP

A remote Model Context Protocol server for Telegram. Connect it to Claude, Cursor or any MCP client and sign in with a Telegram QR code.

## Requirements

- Node.js 22.18 or later
- A Telegram API ID and API hash from [my.telegram.org](https://my.telegram.org)

## Installation

```bash
git clone <your-repo-url> telegram-mcp
cd telegram-mcp
npm install
```

## Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `TELEGRAM_API_ID` | Yes | API ID from my.telegram.org > API development tools |
| `TELEGRAM_API_HASH` | Yes | API hash from the same page |
| `SESSION_ENCRYPTION_KEY` | Yes | 64-character hex key, see below |
| `APP_URL` | No | Public base URL, e.g. `https://telegram-mcp.example.com` |
| `PORT` | No | Local port, defaults to `3000` |

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep this key secret and stable. Changing it signs out every connected user.

## Running locally

```bash
npm run dev
```

The server starts at `http://localhost:3000` and the MCP endpoint is `http://localhost:3000/mcp`.

For a production build:

```bash
npm run build
npm start
```

## Deploying to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. Import the repository in the Vercel dashboard.
3. Add `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` and `SESSION_ENCRYPTION_KEY` under **Settings > Environment Variables**.
4. Deploy.

Your MCP endpoint is `https://<your-project>.vercel.app/mcp`.

## Connecting a client

### Claude Code

```bash
claude mcp add --transport http telegram https://<your-project>.vercel.app/mcp
```

### Claude Desktop and Claude.ai

Go to **Settings > Connectors > Add custom connector** and enter the MCP endpoint URL.

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "telegram": {
      "url": "https://<your-project>.vercel.app/mcp"
    }
  }
}
```

### Signing in

On first use, the client opens a sign-in page in your browser:

1. Open Telegram on your phone.
2. Go to **Settings > Devices > Link Desktop Device**.
3. Scan the QR code.
4. Enter your cloud password if two-step verification is enabled.

To disconnect, run the `logout` tool or end the **Telegram MCP** session under **Settings > Devices**.

## Tools

| Category | Tools |
| --- | --- |
| Account | `get_me`, `update_profile`, `logout` |
| Chats | `list_dialogs`, `get_chat`, `search_public_chats`, `join_chat`, `leave_chat`, `create_group`, `create_channel`, `archive_chat`, `mute_chat`, `pin_chat`, `export_invite_link` |
| Messages | `get_messages`, `get_unread`, `search_messages`, `send_message`, `reply_to_message`, `edit_message`, `delete_messages`, `forward_messages`, `pin_message`, `unpin_message`, `mark_read`, `get_replies`, `get_scheduled_messages` |
| Reactions | `send_reaction`, `remove_reaction`, `get_message_reactions` |
| Polls | `send_poll`, `vote_poll`, `retract_vote`, `get_poll_results`, `close_poll` |
| Media | `send_file`, `download_media`, `send_location`, `send_contact`, `send_dice` |
| Contacts | `list_contacts`, `get_user`, `add_contact`, `delete_contact`, `block_user`, `unblock_user` |
| Group admin | `get_participants`, `add_members`, `remove_member`, `promote_admin`, `demote_admin`, `set_chat_title`, `set_chat_description`, `set_chat_photo` |

## Limits

- Uploads and downloads through the server are capped at 3 MB. Use `send_file` with a `url` for larger files.
- New messages are not pushed to the client. Use `get_unread` to check for new activity.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with auto-reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
