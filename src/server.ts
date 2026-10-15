import { createServer } from "node:http";
import { handle } from "./app.ts";
import { sendWebResponse, toWebRequest } from "./shared/utils/nodeAdapter.ts";

const port = Number(process.env.PORT) || 3000;

const server = createServer(async (req, res) => {
  try {
    await sendWebResponse(res, await handle(await toWebRequest(req)));
  } catch (error) {
    console.error("Failed to serve request:", error instanceof Error ? error.message : String(error));
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "server_error" }));
  }
});

server.listen(port, () => {
  console.log(`Telegram MCP listening on http://localhost:${port}`);
});
