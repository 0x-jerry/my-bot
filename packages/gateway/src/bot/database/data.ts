import { getDatabaseClient } from "../../database";

export async function getBotData<T>(name: string) {
  const db = getDatabaseClient();

  const data = await db.botData.findUnique({
    where: {
      name,
    },
  });

  if (!data?.data) {
    return undefined;
  }

  return JSON.parse(data.data) as T;
}

export async function saveBotData<T>(name: string, data: T) {
  const db = getDatabaseClient();
  const dataStr = JSON.stringify(data);

  const record = await db.botData.upsert({
    where: {
      name,
    },
    update: {
      data: dataStr,
    },
    create: {
      name,
      data: dataStr,
    },
  });

  return record;
}
