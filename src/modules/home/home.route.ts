import type { Routes } from "../../shared/utils/routes.ts";
import { handleHome } from "./home.controller.ts";

export const homeRoutes: Routes = {
  "/": { GET: handleHome },
};
