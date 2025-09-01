const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { JSONFile } = require('lowdb/node');
const { Low } = require('lowdb');
const got = require('got').default;
const fs = require('node:fs');
let lastRefleshProblems = new Date();

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
		await interaction.reply('処理中です...');
		let problems;
		if ((new Date() - lastRefleshProblems) > 24 * 60 * 60 * 1000) {
			lastRefleshProblems = new Date();
			const problemUrl = 'https://kenkoooo.com/atcoder/resources/problem-models.json';
			try {
				const response = await got(problemUrl);
				problems = JSON.parse(response.body);
				problems = problems.filter(problem => /^(abc|arc|agc)/.test(problem.id));
				fs.writeFileSync(require('path').join(__dirname, '../problems.json'), JSON.stringify(problems, null, 2));
				console.log(`Fetched ${problems.length} problems from API`);
			} catch (error) {
				await interaction.editReply(`問題データの取得中にエラーが発生しました。\n${error.message}`);
				return;
			}
		} else {
			problems = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../problems.json')));
		}
		let filteredProblems = problems.filter(problem => {
			const difficulty = problem.difficulty || 0;
			return difficulty >= minDifficulty && difficulty <= maxDifficulty;
		});
	},
};