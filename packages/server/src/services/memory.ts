import type {
  ChatMemoryModel,
  ChatMemoryWhereInput,
} from '../../generated/prisma/models'
import { db } from '../database'

export async function search(keywords: string[]): Promise<ChatMemoryModel[]> {
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

export async function create(
  sessionId: number,
  content: string,
): Promise<ChatMemoryModel> {
  const result = await db.chatMemory.create({
    data: {
      sessionId,
      content,
    },
  })

  return result
}
