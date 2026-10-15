import type { McpServer } from "@modelcontextprotocol/server";
import { Api } from "telegram";
import { z } from "zod";
import { defineTool, DESTRUCTIVE, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { mapEntity } from "../services/mappers.ts";

export function registerAccountTools(server: McpServer): void {
  defineTool(server, "get_me", {
    title: "Get my account",
    description: "Return the logged-in Telegram account: id, name, username and phone.",
    input: z.object({}),
    annotations: READ_ONLY,
    run: async (client) => mapEntity(await client.getMe()),
  });

  defineTool(server, "update_profile", {
    title: "Update my profile",
    description: "Change the first name, last name or bio of the logged-in account. Omitted fields stay unchanged.",
    input: z.object({
      firstName: z.string().min(1).max(64).optional(),
      lastName: z.string().max(64).optional(),
      bio: z.string().max(70).optional().describe("Profile bio, up to 70 characters"),
    }),
    annotations: WRITE,
    run: async (client, { firstName, lastName, bio }) => {
      const user = await client.invoke(new Api.account.UpdateProfile({ firstName, lastName, about: bio }));
      return mapEntity(user);
    },
  });

  defineTool(server, "logout", {
    title: "Log out",
    description:
      "Terminate this Telegram session. The connector stops working until the user logs in again with a new QR code.",
    input: z.object({}),
    annotations: DESTRUCTIVE,
    run: async (client) => {
      await client.invoke(new Api.auth.LogOut());
      return { loggedOut: true, message: "Session terminated. Reconnect the connector to log in again." };
    },
  });
}
