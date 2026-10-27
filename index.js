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
    console.log("Бот успешно запустился.");
  } catch (error) {
    console.log("Ошибка, бот не смог запуститься:  " + error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case "stop":
      if (intervalSendID) {
        await interaction.reply({
          content: "Бот перестал рассылать новости",
          flags: MessageFlags.Ephemeral,
        });
        clearInterval(intervalSendID);
        intervalSendID = null;
      } else {
        await interaction.reply({
          content: "Бот уже остановлен его не нужно останавливать повторно",
          flags: MessageFlags.Ephemeral,
        });
      }
      break;

    case "start":
      const channel = client.channels.cache.get(process.env.CHANNEL_ID);

      if (!channel) {
        console.log("Канал с указанным айди не найден в кеше бота!");
        return await interaction.reply({
          content:
            "Ошибка: не удалось найти новостной канал. Проверь CHANNEL_ID",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (intervalSendID) {
        return await interaction.reply({
          content: "бот уже активен его не нужно запускать повторно",
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.reply({
        content: "бот начал рассылать новости",
        flags: MessageFlags.Ephemeral,
      });

      SendNews(channel); //первый раз чтобы сразу запустился

      intervalSendID = setInterval(async () => {
        try {
          console.log(
            `[${new Date().toLocaleTimeString("ru-RU")}] Проверяю сайт на наличие новостей...`,
          ); // Проверка на работоспособность
          await SendNews(channel);
        } catch (error) {
          if (error.response) {
            // Если сайт ответил, но выдал ошибку (например, 403 или 503 — это блок защиты)
            console.log(
              `[Ошибка сайта] Код ответа: ${error.response.status}. Возможно, сработал анти-DDoS!`,
            );
          } else {
            // Если проблема в сети или коде
            console.log("Ошибка при периодической отправке новостей:", error);
            console.error(error.stack);
          }
        }
      }, 1800000);

      break;
  }
});
try {
  await client.login(process.env.BOT_TOKEN);
} catch (error) {
  console.error("КРИТИЧЕСКАЯ ОШИБКА: Бот не смог запуститься!");
  console.error("Возможно, указан неверный BOT_TOKEN или нет интернета.");
  console.error(error.message);
}

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
    const newNewsID = latestNewsCard.attr("data-key");
    if (newNewsID === lastStorageID) {
      return;
    } // Получаем айди(id) новости
    const newNewsText = latestNewsCard.find("a").eq(1).text(); //Получаем текст новости

    let getPicture = latestNewsCard.find("img").attr("src");
    if (getPicture) {
      getPicture = getPicture.replace(/\/c\d+x\d+\/[^/]+\//, "/");
    }

    let getURL = latestNewsCard.find("a").eq(0).attr("href");
    if (getURL && getURL.startsWith("/"))
      getURL = `https://stopgame.ru${getURL}`;

    const response2 = await axios.get(getURL);

    const $2 = cheerio.load(response2.data);

    const firstLine = $2("#material_content");

    const getLine = firstLine.find("p").first().text().trim();

    if (!newNewsID || !newNewsText) return;

    embed
      .setTitle(newNewsText)
      .setDescription(getLine)
      .setImage(getPicture)
      .setURL(getURL)
      .setColor("#610505");

    lastStorageID = newNewsID;

    channel.send({ embeds: [embed] });
  } catch (error) {
    console.log("произошла ошибка заргузки сайта");
    console.error(error.stack);
  }
}
