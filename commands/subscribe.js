'use strict';

const wait = require('node:timers/promises').setTimeout;
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { subscriptions } = require('../subscriptions');
const { parse } = require('../parse');
const { runCommands } = require('../actions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe a list of commands in the current channel.')
    .addIntegerOption(option =>
      option
        .setName('interval')
        .setDescription('The time interval (minutes) between each execution.')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('base64_command')
        .setDescription('The base64 encoded command list.')
        .setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const interval = interaction.options.getInteger('interval');
    const channelId = interaction.channelId;
    const timestamp = Date.now();
    const raw_command = Buffer.from(interaction.options.getString('base64_command'), 'base64')
      .toString('utf8');

    const { commands, error_message } = parse(raw_command);
    if (error_message) {
      await interaction.editReply(error_message);
      return;
    }

    for (const { type } of commands) {
      if (type == '/login') {
        await interaction.editReply('Should not use `/login` in commands in loops.');
        return;
      }
    }

    const res = subscriptions.add(channelId, raw_command, interval, timestamp);
    const sub = res.sub;
    const embed = new EmbedBuilder()
      .setThumbnail('https://avatars.githubusercontent.com/u/26401354?s=200&v=4');
    if (!res.success) {
      embed
        .setTitle(`Subscribe ${interaction.channel.name} 🔴`)
        .setDescription(
          `${interaction.channel} already subscribed with:\n` +
          'If you hope to change the subscription on this channel, please run `/unsubscribe` first.',
        );
      embed.addFields({ name: 'old command', value: sub.command });
      embed.addFields({ name: 'old interval', value: `${sub.interval} min` });
      await interaction.editReply({ embeds: [embed] });
      return;
    } else {
      embed
      .setTitle(`Subscribe ${interaction.channel.name} 🟢`)
        .setDescription(
          `${interaction.channel} subscribed`,
        );
      embed.addFields({ name: 'command', value: sub.command });
      embed.addFields({ name: 'interval', value: `${sub.interval} min` });
      await interaction.editReply({ embeds: [embed] });
    }
    while (subscriptions.includes(channelId, timestamp)) {
      const { success, messages } = await runCommands(interaction.user.username, commands);
      // Slash command expires in 15 minutes, so need to use `channel.send`.
      for (const message of messages) {
        await interaction.channel.send(message);
      }
      if (!success) {
        if (subscriptions.includes(channelId, timestamp)) {
          subscriptions.remove(channelId);
        }
        break;
      }
      await wait(interval * 60 * 1000);
    }
  },
};
