import { OpenAI } from 'openai'

export function createClient(): OpenAI {
  const openai = new OpenAI()

  return openai
}
