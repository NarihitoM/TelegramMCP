import { appOrigin } from "../../shared/utils/http.ts";
import { MCP_PATH } from "../oauth/index.ts";
import { homePage } from "./home.page.ts";

export function handleHome(req: Request): Response {
  return homePage(`${appOrigin(req)}${MCP_PATH}`);
}
