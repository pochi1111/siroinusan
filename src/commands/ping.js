const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('botが正常に動作している場合、pongを返します。'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};