const { bot } = require('./bot');
const { getDB } = require('./db');

bot.command('stats', async (ctx) => {
  try {
    const db = getDB();
    const [userCount, chatCount, nsfwCount] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('chats').countDocuments({}),
      db.collection('files').countDocuments({ nsfw: true }),
    ]);

    await ctx.reply(
      `📊 *Stats:*\n\n` +
      `👤 Users: ${userCount}\n` +
      `💬 Chats: ${chatCount}\n` +
      `🚫 NSFW Files Detected: ${nsfwCount}`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Stats error:', err);
    await ctx.reply('Failed to fetch stats.');
  }
});
