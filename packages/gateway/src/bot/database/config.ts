import { getDatabaseClient } from "../../database";

export async function getBotConfig<T>(name: string) {
  const db = getDatabaseClient();

  const config = await db.botConfig.findUnique({
    where: {
      name,
    },
  });

  if (!config?.config) {
    return undefined;
  }

  return JSON.parse(config.config) as T;
}

export async function saveBotConfig<T>(name: string, config: T) {
  const db = getDatabaseClient();
  const configStr = JSON.stringify(config);

  const record = await db.botConfig.upsert({
    where: {
      name,
    },
    update: {
      config: configStr,
    },
    create: {
      name,
      config: configStr,
    },
  });

  return record;
}
