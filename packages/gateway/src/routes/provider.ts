import { Hono } from "hono";
import { proxy } from "hono/proxy";
import { getDatabaseClient } from "../database";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";

const providerConfigSchema = z.object({
  name: z.string(),
  type: z.enum(["openai-compatible"]),
  baseURL: z.url(),
  apiKey: z.string(),
});

export function setupProviderRoutes(app: Hono) {
  const db = getDatabaseClient();

  app.post("/provider", async (c) => {
    const body = await c.req.json();
    const result = providerConfigSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: z.treeifyError(result.error) }, 400);
    }

    const { name, type, baseURL, apiKey } = result.data;

    try {
      const provider = await db.providerConfig.create({
        data: {
          name,
          type,
          baseURL,
          apiKey,
        },
      });
      return c.json(provider, 201);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          return c.json({ error: `Provider ${name} already exists` }, 409);
        }
      }

      return c.json({ error: String(e) }, 500);
    }
  });

  app.put("/provider/:name", async (c) => {
    const name = c.req.param("name");
    const body = await c.req.json();
    const result = providerConfigSchema.partial().safeParse(body);

    if (!result.success) {
      return c.json({ error: z.treeifyError(result.error) }, 400);
    }

    try {
      const provider = await db.providerConfig.update({
        where: { name },
        data: result.data,
      });
      return c.json(provider);
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          return c.json({ error: `Provider ${name} not found` }, 404);
        }
      }

      return c.json({ error: String(e) }, 500);
    }
  });

  app.delete("/provider/:name", async (c) => {
    const name = c.req.param("name");

    try {
      await db.providerConfig.delete({
        where: { name },
      });
      return c.json({ message: `Provider ${name} deleted` });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2025") {
          return c.json({ error: `Provider ${name} not found` }, 404);
        }
      }

      return c.json({ error: String(e) }, 500);
    }
  });

  app.all("/provider/:name/:path{.+}", async (c) => {
    const name = c.req.param("name");
    const path = c.req.param("path");

    const provider = await db.providerConfig.findUnique({
      where: {
        name,
      },
    });

    if (!provider) {
      return c.json({ error: `Provider ${name} not found` }, 404);
    }

    const destUrl = new URL(path, provider.baseURL);
    const headers = new Headers(c.req.raw.headers);

    switch (provider.type) {
      case "openai-compatible":
        headers.set("Authorization", `Bearer ${provider.apiKey}`);
        break;

      default:
        return c.json(
          { error: `Provider type ${provider.type} not support` },
          400,
        );
    }

    return proxy(destUrl, {
      ...c.req,
      headers: headers,
    });
  });
}
