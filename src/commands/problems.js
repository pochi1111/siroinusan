const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { JSONFile } = require('lowdb/node');
const { Low } = require('lowdb');
const got = require('got').default;

const adapter = new JSONFile(require('path').join(__dirname, '../db.json'));
const db = new Low(adapter, { users: [] });

module.exports = {
	data: new SlashCommandBuilder()
		.setName('problems')
		.setDescription('ランダムな問題を表示します。')
		.addIntegerOption(option =>
			option.setName('count')
				.setDescription('表示する問題の数')
				.setMinValue(1)
				.setMaxValue(50)
				.setRequired(false),
		)
		.addIntegerOption(option =>
			option.setName('min_difficulty')
				.setDescription('問題の難易度の下限')
				.setMinValue(0)
				.setMaxValue(3999)
				.setRequired(false),
		)
		.addIntegerOption(option =>
			option.setName('max_difficulty')
				.setDescription('問題の難易度の上限')
				.setMinValue(1)
				.setMaxValue(4000)
				.setRequired(false),
		)
		.addBooleanOption(option =>
			option.setName('is_solved')
				.setDescription('解いた問題を含めるかどうか')
				.setRequired(false),
		),
	async execute(interaction) {
		await db.read();
		if (db.data === null) {
			db.data = { users: [] };
		}
		const userId = interaction.user.id;
		const atcoderId = db.data.users.find(user => user.discordId === userId)?.atcoderId;
		if (!atcoderId) {
			await interaction.reply({ content: 'AtCoder IDが設定されていません。', flags: MessageFlags.Ephemeral });
			return;
		}
		const url = `https://atcoder.jp/users/${atcoderId}/history/json`;
		let userHistory;
		try {
			const res = await got(url);
			userHistory = JSON.parse(res.body);
		} catch (error) {
			await interaction.reply({ content: 'AtCoderの履歴データ取得中にエラーが発生しました。\n ' + error.message, flags: MessageFlags.Ephemeral });
			return;
		}
		const Ratings = userHistory.map(entry => entry.NewRating);
		const latestRating = Ratings[Ratings.length - 1];
		const count = interaction.options.getInteger('count') || 1;
		const minDifficulty = interaction.options.getInteger('min_difficulty') || latestRating - 200;
		const maxDifficulty = interaction.options.getInteger('max_difficulty') || latestRating + 200;
		const isSolved = interaction.options.getBoolean('is_solved') || false;
		if (minDifficulty > maxDifficulty) {
			await interaction.reply({ content: '難易度の下限を上限より小さくして下さい。', flags: MessageFlags.Ephemeral });
			return;
		}
		await interaction.reply('問題を表示します。');
	},
};