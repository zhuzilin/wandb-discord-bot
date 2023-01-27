'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { subscriptions } = require('../subscriptions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Unsubscribe the commands in the current channel.'),
  async execute(interaction) {
    const res = subscriptions.remove(interaction.channelId);
    if (res.success) {
      const { command, interval } = res.sub;
      const embed = new EmbedBuilder()
        .setTitle(`Unsubscribing ${interaction.channel.name} 🟢`)
        .setThumbnail('https://avatars.githubusercontent.com/u/26401354?s=200&v=4')
        .setDescription(`${interaction.channel} unsubscribed.`)
        .addFields({ name: 'old command', value: command })
        .addFields({ name: 'old interval', value: `${interval} min` });
      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply(`${interaction.channel} was not subscribed.`);
    }
  },
};
