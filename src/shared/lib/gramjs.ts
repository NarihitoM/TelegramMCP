import { client, errors, helpers, Logger, password, sessions, utils } from "telegram";

export const { RPCError, FloodWaitError } = errors;
export const { StringSession } = sessions;
export const { CustomFile } = client.uploads;
export const { getDisplayName, getPeerId } = utils;
export const { generateRandomBigInt, returnBigInt } = helpers;
export const { computeCheck } = password;

export type StringSession = InstanceType<typeof StringSession>;
export type CustomFile = InstanceType<typeof CustomFile>;

export class SilentLogger extends Logger {
  override log(): void {}
}
