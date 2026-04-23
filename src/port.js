// port.js – single source of truth for all runtime config
// Values are read from environment variables; defaults are for local dev.

const config = {
  // ── Server ────────────────────────────────────────────────────────────────
  // Render injects PORT automatically; locally falls back to 3000.
  port: parseInt(process.env.PORT, 10) || 3000,

  // ── Telegram ──────────────────────────────────────────────────────────────
  botToken: process.env.BOT_TOKEN || '',

  // Full public HTTPS URL of this Render service, e.g.:
  //   https://nsfw-detection-bot.onrender.com
  // Leave empty to use long-polling (local dev).
  webhookDomain: process.env.WEBHOOK_DOMAIN || '',

  // ── MongoDB ───────────────────────────────────────────────────────────────
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',

  // ── Environment ───────────────────────────────────────────────────────────
  isDev:        process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
};

// ── Validation ────────────────────────────────────────────────────────────────
const required = ['botToken', 'mongoUri'];
for (const key of required) {
  if (!config[key]) {
    console.error(`❌  Missing required env var for "${key}". Check your .env or Render dashboard.`);
    process.exit(1);
  }
}

module.exports = config;
