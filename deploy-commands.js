import { REST, Routes } from "discord.js";

const commands = [
  {
    name: "stop",
    description: "stop bot message",
  },

  {
    name: "start",
    description: "start bot message",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

try {
  console.log("Started refreshing application (/) commands.");

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commands,
  });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}
