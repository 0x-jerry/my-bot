import { TelegramAdapter } from "./adapter";

const telegramAdapter = new TelegramAdapter({
  token: process.env.TELEGRAM_BOT_TOKEN!,
});

telegramAdapter.setCommands([
  {
    command: "test",
    description: "test command",
  },
]);

telegramAdapter.on("command", (evt) => {
  console.log("test command:", evt);
  telegramAdapter.reply(evt.chatId, evt.messageId, "test command received");
});

telegramAdapter.on("message", (evt) => {
  console.log("message:", evt);

  telegramAdapter.send(evt.chatId, "message received");
});

telegramAdapter.start();
