import { createApp } from "./app.js";
import { BetwayClient, betwayConfigFromEnvironment } from "./betway.js";
import { SqliteOperationStore } from "./store.js";

const port = Number(process.env.PORT) || 8080;
const provider = new BetwayClient(betwayConfigFromEnvironment());
const store = new SqliteOperationStore();
const app = createApp({ provider, store, serveWeb: process.env.NODE_ENV === "production" });

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`BetBridge listening on http://localhost:${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received; closing cleanly.`);
  server.close(() => {
    store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
