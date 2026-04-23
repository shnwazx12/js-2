require('./port');           // validates env vars early – exits if BOT_TOKEN or MONGO_URI missing

const { connectDB }   = require('./db');
const { startServer } = require('./server');

require('./antinsfw');  // registers media handlers on the bot
require('./stats');     // registers /stats command

async function main() {
  await connectDB();
  await startServer();
  console.log('🤖 Bot Started! Powered By @VivaanNetwork');
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT',  () => process.exit(0));
process.once('SIGTERM', () => process.exit(0));
