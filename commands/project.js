'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { reply } = require('../utils');
const { projectCommand } = require('../actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('project')
    .setDescription('The path of the project, should be of form `username/project`.')
    .addStringOption(option =>
      option
        .setName('project')
        .setDescription('The path of the project, should be of form username/project.')
        .setRequired(true))
    .addIntegerOption(option =>
      option
        .setName('topk')
        .setDescription('The number of runs to check, when setting at non-positive integer, all runs will be returned.'))
    .addStringOption(option =>
      option
        .setName('filters')
        .setDescription('The filter of the runs, should be a `JSON.stringify`/`json.dumps` version of the `filters` argument for `wandb.public.Api.runs`.'))
    .addStringOption(option =>
      option
        .setName('order')
        .setDescription('The way to order the runs. It is the same as  the `order` argument for `wandb.public.Api.runs`. Default is a descending order on the creation time of the runs.')),
  async execute(interaction) {
    const project = interaction.options.getString('project');
    const topk = interaction.options.getInteger('topk');
    const filters = interaction.options.getString('filters');
    const order = interaction.options.getString('order');

    await interaction.deferReply();
    const resp = await projectCommand(interaction.user.username, project, topk, filters, order);
    await reply(interaction, resp.messages, true);
  },
};
