import type { Hono } from "hono";

import { gv } from "../../global";

export function setupAgentsRoutes(app: Hono) {
  /**
   * Get all agents
   */
  app.get("/", async (c) => {
    const agents = Object.entries(gv.config.agents || {}).map(
      ([name, config]) => ({
        id: name,
        name: config.name,
        description: config.description || "",
        model: config.model,
      }),
    );

    return c.json(agents);
  });

  /**
   * Get agent config by id
   */
  app.get("/:id", async (c) => {
    const id = c.req.param("id");

    const agent = gv.config.agents?.[id];

    if (!agent) {
      return c.json({ error: "Agent not found" }, 404);
    }

    return c.json(agent);
  });
}
