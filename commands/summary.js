'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { reply } = require('../utils');
const { summaryCommand } = require('../actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('summary')
    .setDescription('Check the running state of a certain run and the stats of its last step.')
    .addStringOption(option =>
      option
        .setName('run')
        .setDescription('The path of the run, shold be of form `username/project/run_id`.')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('filters')
        .setDescription('Filters for the stats to show, in which each filter connected by `,` represents the stats you hope to show. In wandb, the stats may be of form `stats_type/stats_name`, you can use only the `states_type` as filter or the full `states_type/states_name`.')),
  async execute(interaction) {
    const run = interaction.options.getString('run');
    const filters = interaction.options.getString('filters');

    await interaction.deferReply();
    const resp = await summaryCommand(interaction.user.username, run, filters);
    await reply(interaction, resp.messages, true);
  },
};
