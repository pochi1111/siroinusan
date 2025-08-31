const { SlashCommandBuilder } = require('discord.js');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const adapter = new JSONFile(require('path').join(__dirname, '../db.json'));
const db = new Low(adapter, { users: [] });

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('atcoder idとdiscord idを紐付けます。')
		.addStringOption(option =>
			option.setName('atcoder_id')
				.setDescription('AtCoder IDを入力してください。')
				.setRequired(true),
		),
	async execute(interaction) {
		await db.read();
		if (db.data === null) {
			db.data = { users: [] };
		}

		const atcoderId = interaction.options.getString('atcoder_id');
		const discordId = interaction.user.id;

		const existingUser = db.data.users.find(user => user.discordId === discordId);
		if (existingUser) {
			existingUser.atcoderId = atcoderId;
		}
		else {
			db.data.users.push({ atcoderId, discordId });
		}
		await db.write();
		await interaction.reply(`AtCoder ID ${atcoderId} を正常に登録しました。`);
	},
};