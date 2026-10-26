import {
  channelLink,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";
import axios from "axios";
import * as cheerio from "cheerio";
let intervalSendID = null; //переменная для запуска и остановки setInterval()

let lastStorageID = null; // переменная для хранения последнего id карточки новости

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  try {
    console.log("The bot has started successfully.");
  } catch (error) {
    console.log("Error, the bot failed to start:  " + error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "stop") {
    await interaction.reply({
      content: "bot has stop send news",
      flags: MessageFlags.Ephemeral,
    });
    if (intervalSendID) {
      clearInterval(intervalSendID);
      intervalSendID = null;
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "start") {
    await interaction.reply({
      content: "bot has start send news",
      flags: MessageFlags.Ephemeral,
    });
    const channel = client.channels.cache.get(process.env.CHANNEL_ID); // Айди канала. Сюда нужно вставить айди канала который ты хочешь сделать новостным

    SendNews(channel); //первый раз чтобы сразу запустился

    intervalSendID = setInterval(async () => {
      await SendNews(channel);
    }, 1800000);
  }
});

client.login(process.env.BOT_TOKEN);

async function SendNews(channel) {
  try {
    const embed = new EmbedBuilder();
    const response = await axios.get("https://stopgame.ru/news", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    const latestNewsCard = $("#w0 [data-key]").first(); //заходим в тег чтобы парсить первый data-key
    const newNewsID = latestNewsCard.attr("data-key"); // Получаем айди(id) новости

    const newNewsText = latestNewsCard.find("a").eq(1).text(); //Получаем текст новости

    let getPicture = latestNewsCard.find("img").attr("src");
    if (getPicture) {
      getPicture = getPicture.replace(/\/c\d+x\d+\/[^/]+\//, "/");
    }

    let getURL = latestNewsCard.find("a").eq(0).attr("href");
    if (getURL && getURL.startsWith("/"))
      getURL = `https://stopgame.ru${getURL}`;

    if (!newNewsID || !newNewsText) return;
    if (newNewsID === lastStorageID) {
      return;
    }

    embed.setTitle(newNewsText).setImage(getPicture).setURL(getURL);

    lastStorageID = newNewsID;

    channel.send({ embeds: [embed] });
  } catch (error) {
    console.log("произошла ошибка заргузки сайта");
    console.error(error.stack);
  }
}
