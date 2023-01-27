'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { reply } = require('../utils');
const { loginCommand } = require('../actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('login')
    .setDescription('Login your wandb account with your `WANDB_API_KEY`.')
    .addStringOption(option =>
      option
        .setName('key')
        .setDescription('Your `WANDB_API_KEY`. You cound find it at: https://wandb.ai/authorize.')
        .setRequired(true),
    ),
  async execute(interaction) {
    const key = interaction.options.getString('key');

    await interaction.deferReply();
    const resp = await loginCommand(interaction.user.username, key);
    await reply(interaction, resp.messages, true);
  },
};
