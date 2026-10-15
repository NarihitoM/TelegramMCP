# Telegram MCP

A remote Model Context Protocol server for Telegram. Sign in with a Telegram QR code.

by Narihito — [@not_narihito](https://t.me/not_narihito)

## Setup

Connect a client to `https://telegram-mcp-by-narihito.vercel.app/mcp`:

OpenCode `opencode.json`

```json
{
  "mcp": {
    "telegram": {
      "type": "remote",
      "url": "https://telegram-mcp-by-narihito.vercel.app/mcp"
    }
  }
}
```

Claude Code

```bash
claude mcp add --transport http telegram https://telegram-mcp-by-narihito.vercel.app/mcp
```

Claude Desktop

Go to Settings > Connectors > Add custom connector and enter `https://telegram-mcp-by-narihito.vercel.app/mcp`.

Cursor `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "telegram": {
      "url": "https://telegram-mcp-by-narihito.vercel.app/mcp"
    }
  }
}
```

Windsurf `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "telegram": {
      "serverUrl": "https://telegram-mcp-by-narihito.vercel.app/mcp"
    }
  }
}
```

VS Code `.vscode/mcp.json`

```json
{
  "servers": {
    "telegram": {
      "type": "http",
      "url": "https://telegram-mcp-by-narihito.vercel.app/mcp"
    }
  }
}
```

Cline / Roo Code

```json
{
  "mcpServers": {
    "telegram": {
      "type": "streamableHttp",
      "url": "https://telegram-mcp-by-narihito.vercel.app/mcp"
    }
  }
}
```

## Tools

| Tool | Description |
| --- | --- |
| `get_me` | Return the logged-in Telegram account: id, name, username and phone. |
| `update_profile` | Change the first name, last name or bio of the logged-in account. Omitted fields stay unchanged. |
| `logout` | Terminate this Telegram session. The connector stops working until the user logs in again with a new QR code. |
| `list_dialogs` | List chats, groups and channels ordered by most recent activity, with unread counts and the last message. |
| `get_chat` | Get details about a user, group or channel, including its description and member counts. |
| `search_public_chats` | Search public users, groups and channels on Telegram by name or username. |
| `join_chat` | Join a public group or channel by @username or link, or a private one by invite link (t.me/+hash). |
| `leave_chat` | Leave a group or channel. |
| `create_group` | Create a new group (supergroup) and optionally add members. |
| `create_channel` | Create a new broadcast channel and optionally add subscribers. |
| `archive_chat` | Move a chat to the archive folder, or back to the main list. |
| `mute_chat` | Mute or unmute notifications for a chat, forever or for a number of seconds. |
| `pin_chat` | Pin or unpin a chat at the top of the chat list. |
| `export_invite_link` | Create an invite link for a group or channel you administer. |
| `get_messages` | Read recent messages from a chat, newest first. Use offsetId to page back through history. |
| `get_unread` | Collect unread messages across chats. Use this to check what is new, since push updates are not available. |
| `search_messages` | Search messages by text inside one chat, or across all chats when chat is omitted. |
| `send_message` | Send a text message. Supports markdown or HTML formatting, replies, silent sending and scheduling. |
| `reply_to_message` | Reply to a specific message in a chat. |
| `edit_message` | Edit the text of a message you sent. |
| `delete_messages` | Delete messages. By default they are deleted for everyone where Telegram allows it. |
| `forward_messages` | Forward messages from one chat to another. |
| `pin_message` | Pin a message in a chat. |
| `unpin_message` | Unpin one message, or every pinned message in the chat when messageId is omitted. |
| `mark_read` | Mark messages in a chat as read, up to maxId or everything when omitted. |
| `get_replies` | Read the reply thread of a message, or the comments under a channel post. |
| `get_scheduled_messages` | List messages scheduled to be sent later in a chat. |
| `send_reaction` | Add an emoji reaction to a message. The emoji must be one the chat allows. |
| `remove_reaction` | Remove your reaction from a message. |
| `get_message_reactions` | Show reaction counts on a message and, where Telegram allows it, who reacted. |
| `send_poll` | Create a poll or quiz in a chat. For a quiz, set quiz=true and correctOption to the index of the right answer. |
| `vote_poll` | Vote in a poll by option index (0-based). Pass several indexes for multiple-choice polls. |
| `retract_vote` | Remove your vote from a poll that is still open. |
| `get_poll_results` | Read poll results. For non-anonymous polls, includeVoters also lists who voted for what. |
| `close_poll` | Stop a poll you created so nobody can vote any more. |
| `send_file` | Send a photo, video, document or voice note. Pass a public url (Telegram downloads it) or base64 data up to 3 MB. |
| `download_media` | Download the photo or file attached to a message (up to 3 MB). Images are returned so they can be viewed. |
| `send_location` | Send a map location. |
| `send_contact` | Share a phone contact card in a chat. |
| `send_dice` | Send an animated dice, darts, basketball, football, bowling or slot machine with a random result. |
| `list_contacts` | List the contacts saved in the Telegram account. |
| `get_user` | Look up a user by @username or id and return their profile and bio. |
| `add_contact` | Save a contact, either an existing Telegram user or a phone number. |
| `delete_contact` | Remove a user from your contacts. |
| `block_user` | Block a user so they cannot message or call you. |
| `unblock_user` | Unblock a previously blocked user. |
| `get_participants` | List members of a group or channel. Channel member lists are only visible to admins. |
| `add_members` | Add users to a group or channel you administer. |
| `remove_member` | Remove a user from a group or channel. With ban=true they cannot rejoin. |
| `promote_admin` | Make a member an admin with the given rights and an optional custom title. |
| `demote_admin` | Remove admin rights from a member. |
| `set_chat_title` | Change the title of a group or channel. |
| `set_chat_description` | Change the description (about text) of a group or channel. |
| `set_chat_photo` | Change the photo of a group or channel from a public image url or base64 data (up to 5 MB). |
