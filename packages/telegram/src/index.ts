import { Bot } from "gramio";

const bot = new Bot(process.env.BOT_TOKEN as string)
    .command("start", (context) => context.send("Hello! I am your new GramIO bot!"))
    .onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));

bot.start();
