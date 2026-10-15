import { z } from "zod";

export const loginStateSchema = z.object({
  session: z.string(),
  request: z.string(),
});

export type LoginState = z.infer<typeof loginStateSchema>;

export type LoginStep =
  | { status: "qr"; qr: string; expiresAt: number }
  | { status: "password"; hint: string; error?: string }
  | { status: "wait"; retryAfter: number }
  | { status: "done"; redirectTo: string }
  | { status: "expired" }
  | { status: "error"; message: string };

export interface LoginOutcome {
  step: LoginStep;
  state?: LoginState | null;
}
