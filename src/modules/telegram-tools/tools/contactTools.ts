import type { McpServer } from "@modelcontextprotocol/server";
import { Api } from "telegram";
import { z } from "zod";
import { generateRandomBigInt, returnBigInt } from "../../../shared/lib/gramjs.ts";
import { defineTool, DESTRUCTIVE, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { ToolError } from "../services/errors.ts";
import { mapEntity } from "../services/mappers.ts";
import { resolvePeer, resolveUser } from "../services/peers.ts";
import { userRef } from "../services/schemas.ts";

export function registerContactTools(server: McpServer): void {
  defineTool(server, "list_contacts", {
    title: "List contacts",
    description: "List the contacts saved in the Telegram account.",
    input: z.object({}),
    annotations: READ_ONLY,
    run: async (client) => {
      const result = await client.invoke(new Api.contacts.GetContacts({ hash: returnBigInt(0) }));
      return result instanceof Api.contacts.Contacts ? result.users.map(mapEntity) : [];
    },
  });

  defineTool(server, "get_user", {
    title: "Get user",
    description: "Look up a user by @username or id and return their profile and bio.",
    input: z.object({ user: userRef }),
    annotations: READ_ONLY,
    run: async (client, { user }) => {
      const entity = await resolveUser(client, user);
      const { fullUser } = await client.invoke(new Api.users.GetFullUser({ id: entity }));
      return {
        ...mapEntity(entity),
        bio: fullUser.about ?? null,
        commonChatsCount: fullUser.commonChatsCount,
        blocked: Boolean(fullUser.blocked),
      };
    },
  });

  defineTool(server, "add_contact", {
    title: "Add contact",
    description: "Save a contact, either an existing Telegram user or a phone number.",
    input: z.object({
      user: userRef.optional().describe("Existing Telegram user to save"),
      phone: z.string().min(3).max(32).optional().describe("Phone number with country code"),
      firstName: z.string().min(1).max(64),
      lastName: z.string().max(64).default(""),
      sharePhone: z.boolean().default(false).describe("Let this contact see your phone number"),
    }),
    annotations: WRITE,
    run: async (client, { user, phone, firstName, lastName, sharePhone }) => {
      if (Boolean(user) === Boolean(phone)) throw new ToolError("Provide exactly one of user or phone");

      if (phone) {
        const result = await client.invoke(
          new Api.contacts.ImportContacts({
            contacts: [new Api.InputPhoneContact({ clientId: generateRandomBigInt(), phone, firstName, lastName })],
          }),
        );
        if (result.users.length === 0) throw new ToolError("No Telegram account uses this phone number");
        return result.users.map(mapEntity);
      }

      const updates = await client.invoke(
        new Api.contacts.AddContact({
          id: await resolvePeer(client, user ?? ""),
          firstName,
          lastName,
          phone: "",
          addPhonePrivacyException: sharePhone,
        }),
      );
      return { added: true, users: "users" in updates ? updates.users.map(mapEntity) : [] };
    },
  });

  defineTool(server, "delete_contact", {
    title: "Delete contact",
    description: "Remove a user from your contacts.",
    input: z.object({ user: userRef }),
    annotations: DESTRUCTIVE,
    run: async (client, { user }) => {
      await client.invoke(new Api.contacts.DeleteContacts({ id: [await resolvePeer(client, user)] }));
      return { deleted: user };
    },
  });

  defineTool(server, "block_user", {
    title: "Block user",
    description: "Block a user so they cannot message or call you.",
    input: z.object({ user: userRef }),
    annotations: DESTRUCTIVE,
    run: async (client, { user }) => {
      await client.invoke(new Api.contacts.Block({ id: await resolvePeer(client, user) }));
      return { blocked: user };
    },
  });

  defineTool(server, "unblock_user", {
    title: "Unblock user",
    description: "Unblock a previously blocked user.",
    input: z.object({ user: userRef }),
    annotations: WRITE,
    run: async (client, { user }) => {
      await client.invoke(new Api.contacts.Unblock({ id: await resolvePeer(client, user) }));
      return { unblocked: user };
    },
  });
}
