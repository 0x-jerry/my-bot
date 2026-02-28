import "dotenv/config";

import { setupProxyAgent } from "./utils";
import { TelegramAdapter } from "./bot";

setupProxyAgent()

const telegramAdapter = new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN!);

telegramAdapter.setCommands([
  {
    command: 'test',
    description: 'test command'
  }
])

telegramAdapter.on('command', (evt) => {
  console.log('test command:', evt)
  telegramAdapter.reply(evt.chatId, evt.messageId, 'test command received')
})

telegramAdapter.on('message', (evt) => {
  console.log('message:', evt)

  telegramAdapter.send(evt.chatId, 'message received')
})

telegramAdapter.start()
