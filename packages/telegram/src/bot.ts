import { Bot } from "gramio";

export function startBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set")
  }

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN)
    .command("start", (context) => {
      context.send("Hello! I am your new GramIO bot!")
    })
    .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));

  bot.start();
}
