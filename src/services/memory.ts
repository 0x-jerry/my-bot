import type {
  ChatMemoryModel,
  ChatMemoryWhereInput,
} from '../../generated/prisma/models'
import { db } from '../database'

export async function searchMemory(
  keywords: string[],
): Promise<ChatMemoryModel[]> {
  const keywordsConditions: ChatMemoryWhereInput[] = []

  for (const keyword of keywords) {
    keywordsConditions.push({
      content: {
        contains: keyword,
      },
    })
  }

  const result = await db.chatMemory.findMany({
    where: {
      OR: keywordsConditions,
    },
  })

  return result
}
