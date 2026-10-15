import type { McpServer } from "@modelcontextprotocol/server";
import { Api } from "telegram";
import { z } from "zod";
import { generateRandomBigInt, getDisplayName, getPeerId } from "../../../shared/lib/gramjs.ts";
import { defineTool, READ_ONLY, WRITE } from "../services/defineTool.ts";
import { ToolError } from "../services/errors.ts";
import { mapMessage, mapPoll } from "../services/mappers.ts";
import { getPollMessage } from "../services/messages.ts";
import { resolvePeer } from "../services/peers.ts";
import { chatRef, isoDateTime, messageId, toUnixSeconds } from "../services/schemas.ts";

function text(value: string): Api.TextWithEntities {
  return new Api.TextWithEntities({ text: value, entities: [] });
}

function optionBytes(index: number): Buffer {
  return Buffer.from(String(index));
}

function pickOptions(poll: Api.Poll, indexes: number[]): Buffer[] {
  return indexes.map((index) => {
    const answer = poll.answers[index];
    if (!answer) throw new ToolError(`Option ${index} does not exist. Valid options are 0 to ${poll.answers.length - 1}.`);
    return answer.option;
  });
}

function voteOptions(vote: Api.TypeMessagePeerVote): Buffer[] {
  if (vote instanceof Api.MessagePeerVote) return [vote.option];
  if (vote instanceof Api.MessagePeerVoteMultiple) return vote.options;
  return [];
}

export function registerPollTools(server: McpServer): void {
  defineTool(server, "send_poll", {
    title: "Send poll",
    description: "Create a poll or quiz in a chat. For a quiz, set quiz=true and correctOption to the index of the right answer.",
    input: z.object({
      chat: chatRef,
      question: z.string().min(1).max(255),
      options: z.array(z.string().min(1).max(100)).min(2).max(10),
      anonymous: z.boolean().default(true),
      multipleChoice: z.boolean().default(false),
      quiz: z.boolean().default(false),
      correctOption: z.number().int().min(0).optional().describe("Index of the correct option, required for quizzes"),
      explanation: z.string().max(200).optional().describe("Shown after answering a quiz"),
      closeInSeconds: z.number().int().min(5).max(600).optional(),
      closeAt: isoDateTime.optional(),
      replyTo: messageId.optional(),
      silent: z.boolean().default(false),
    }),
    annotations: WRITE,
    run: async (client, input) => {
      if (input.quiz && input.correctOption === undefined) throw new ToolError("A quiz needs correctOption");
      if (input.quiz && input.multipleChoice) throw new ToolError("A quiz cannot allow multiple answers");
      if (input.correctOption !== undefined && input.correctOption >= input.options.length) {
        throw new ToolError("correctOption is out of range");
      }

      const poll = new Api.Poll({
        id: generateRandomBigInt(),
        question: text(input.question),
        answers: input.options.map((option, index) => new Api.PollAnswer({ text: text(option), option: optionBytes(index) })),
        publicVoters: !input.anonymous,
        multipleChoice: input.multipleChoice,
        quiz: input.quiz,
        closePeriod: input.closeInSeconds,
        closeDate: input.closeAt ? toUnixSeconds(input.closeAt) : undefined,
      });

      const media = new Api.InputMediaPoll({
        poll,
        correctAnswers: input.quiz && input.correctOption !== undefined ? [optionBytes(input.correctOption)] : undefined,
        solution: input.quiz ? input.explanation : undefined,
        solutionEntities: input.quiz && input.explanation ? [] : undefined,
      });

      const message = await client.sendFile(await resolvePeer(client, input.chat), {
        file: media,
        replyTo: input.replyTo,
        silent: input.silent,
      });
      return mapMessage(message);
    },
  });

  defineTool(server, "vote_poll", {
    title: "Vote in poll",
    description: "Vote in a poll by option index (0-based). Pass several indexes for multiple-choice polls.",
    input: z.object({
      chat: chatRef,
      messageId,
      options: z.array(z.number().int().min(0)).min(1).max(10),
    }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id, options }) => {
      const peer = await resolvePeer(client, chat);
      const { media } = await getPollMessage(client, peer, id);
      if (options.length > 1 && !media.poll.multipleChoice) throw new ToolError("This poll allows only one answer");

      await client.invoke(new Api.messages.SendVote({ peer, msgId: id, options: pickOptions(media.poll, options) }));
      return mapPoll((await getPollMessage(client, peer, id)).media);
    },
  });

  defineTool(server, "retract_vote", {
    title: "Retract poll vote",
    description: "Remove your vote from a poll that is still open.",
    input: z.object({ chat: chatRef, messageId }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id }) => {
      const peer = await resolvePeer(client, chat);
      await client.invoke(new Api.messages.SendVote({ peer, msgId: id, options: [] }));
      return mapPoll((await getPollMessage(client, peer, id)).media);
    },
  });

  defineTool(server, "get_poll_results", {
    title: "Get poll results",
    description: "Read poll results. For non-anonymous polls, includeVoters also lists who voted for what.",
    input: z.object({
      chat: chatRef,
      messageId,
      includeVoters: z.boolean().default(false),
      votersLimit: z.number().int().min(1).max(100).default(50),
    }),
    annotations: READ_ONLY,
    run: async (client, { chat, messageId: id, includeVoters, votersLimit }) => {
      const peer = await resolvePeer(client, chat);
      const { media } = await getPollMessage(client, peer, id);
      const results = mapPoll(media);

      if (!includeVoters || !media.poll.publicVoters) return results;

      const list = await client.invoke(new Api.messages.GetPollVotes({ peer, id, limit: votersLimit }));
      const names = new Map([...list.users, ...list.chats].map((entity) => [getPeerId(entity), getDisplayName(entity)]));
      const optionIndex = new Map(media.poll.answers.map((answer, index) => [Buffer.from(answer.option).toString("hex"), index]));

      const voters = list.votes.map((vote) => {
        const voterId = getPeerId(vote.peer);
        return {
          id: voterId,
          name: names.get(voterId) ?? null,
          options: voteOptions(vote).map((option) => optionIndex.get(Buffer.from(option).toString("hex")) ?? null),
        };
      });

      return { ...results, voters };
    },
  });

  defineTool(server, "close_poll", {
    title: "Close poll",
    description: "Stop a poll you created so nobody can vote any more.",
    input: z.object({ chat: chatRef, messageId }),
    annotations: WRITE,
    run: async (client, { chat, messageId: id }) => {
      const peer = await resolvePeer(client, chat);
      const { poll } = (await getPollMessage(client, peer, id)).media;

      await client.invoke(
        new Api.messages.EditMessage({
          peer,
          id,
          media: new Api.InputMediaPoll({
            poll: new Api.Poll({
              id: poll.id,
              question: poll.question,
              answers: poll.answers,
              closed: true,
              publicVoters: poll.publicVoters,
              multipleChoice: poll.multipleChoice,
              quiz: poll.quiz,
            }),
          }),
        }),
      );

      return mapPoll((await getPollMessage(client, peer, id)).media);
    },
  });
}
