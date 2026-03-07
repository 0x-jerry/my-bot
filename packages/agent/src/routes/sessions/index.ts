import { Hono } from "hono";
import { gv } from "../../global";

export function setupSessionsRoutes(app: Hono) {
  app.get("/", async (c) => {
    const sessions = await gv.db.session.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(sessions);
  });

  app.post("/", async (c) => {
    const body = await c.req.json<{ profile?: string }>();
    const profile = body.profile || Object.keys(gv.config.agents || {})[0];

    if (!gv.config.agents?.[profile]) {
      return c.json({ error: "Invalid agent profile" }, 400);
    }

    const session = await gv.db.session.create({
      data: {
        agentProfile: profile,
      },
    });

    return c.json(session);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const session = await gv.db.session.findUnique({
      where: { id },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    await gv.db.session.delete({
      where: { id },
    });
    return c.json({ success: true });
  });
}
