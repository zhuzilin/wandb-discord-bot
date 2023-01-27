'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { reply } = require('../utils');
const { imageCommand } = require('../actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('image')
    .setDescription('Plot figures of the runs.')
    .addStringOption(option =>
      option
        .setName('project')
        .setDescription('The path of the project, should be of form `username/project`.')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('runs')
        .setDescription('The _run_id_ of the runs to be plot. They should be connected with `,`.')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('keys')
        .setDescription('The stats key to plot. They should be connected with `,`.')
        .setRequired(true)),
  async execute(interaction) {
    const project = interaction.options.getString('project');
    const runs = interaction.options.getString('runs');
    const keys = interaction.options.getString('keys');

    await interaction.deferReply();
    const resp = await imageCommand(interaction.user.username, project, runs, keys);
    await reply(interaction, resp.messages, true);
  },
};
