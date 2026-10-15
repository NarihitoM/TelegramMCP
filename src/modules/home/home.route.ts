import type { Routes } from "../../shared/utils/router.ts";
import { handleHome } from "./home.controller.ts";

export const homeRoutes: Routes = {
  "/": { GET: handleHome },
};
