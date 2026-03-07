import { Hono } from "hono";
import { setupSessionsRoutes } from "./sessions";

export function setupRoutes(app: Hono) {
  const apiApp = app.basePath("/api");

  setupSessionsRoutes(apiApp.basePath("/sessions"));
}
