import { Bot, InlineKeyboard } from "gramio";

export function startBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN)
    .command("start", (context) => {
      context.send("Hello! I am your new GramIO bot!", {
        reply_markup: new InlineKeyboard()
          .text("About", "about")
          .url("GitHub", "https://github.com/gramiojs/gramio")
          .row()
          .text("Settings ⚙️", "settings"),
      });
    })
    .on("callback_query", (context) => {
      if (context.data === "about") {
        return context.send(
          "This is a Telegram bot built with GramIO, TypeScript, and pnpm!"
        );
      }
      if (context.data === "settings") {
        return context.send("Settings are not implemented yet.");
      }
    })
    .onStart(({ info }) => {
      console.log(`✨ Bot ${info.username} was started!`);

      bot.api.setMyCommands({
        commands: [
          {
            command: "start",
            description: "Start the bot",
          },
        ],
      });
    });

  bot.start();
}
