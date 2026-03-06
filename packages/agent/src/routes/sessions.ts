import { Hono } from "hono";

export function setupSessionsRoutes(app: Hono) {
  const api = app.basePath("/sessions");

  api.get("/", (c) => {
    return c.json({});
  });

  api.post("/", (c) => {
    return c.json({});
  });

  api.put("/:id", (c) => {
    return c.json({});
  });

  api.delete("/:id", (c) => {
    const id = c.req.param("id");
    return c.json({});
  });
}
