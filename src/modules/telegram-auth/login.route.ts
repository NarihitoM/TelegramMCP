import type { Routes } from "../../shared/utils/router.ts";
import { handleAuthorize, handlePassword, handlePoll, handleStart } from "./login.controller.ts";

export const loginRoutes: Routes = {
  "/authorize": { GET: handleAuthorize },
  "/api/telegram/login/start": { POST: handleStart },
  "/api/telegram/login/qr": { GET: handlePoll },
  "/api/telegram/login/password": { POST: handlePassword },
};
