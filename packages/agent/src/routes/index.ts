import { Hono } from "hono";
import { setupSessionsRoutes } from "./sessions";
import { setupAgentsRoutes } from "./agents";

export function setupRoutes(app: Hono) {
  const apiApp = app.basePath("/api");

  setupSessionsRoutes(apiApp.basePath("/sessions"));
  setupAgentsRoutes(apiApp.basePath("/agents"));
}
