const express = require('express');
const { bot } = require('./bot');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'NSFW Detection Bot', uptime: process.uptime() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ── Telegram Webhook (used in production on Render) ───────────────────────────
// Render provides a public HTTPS URL, so we use webhooks instead of long-polling.
async function startWebhookServer() {
  const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN; // e.g. https://your-app.onrender.com
  const WEBHOOK_PATH   = `/webhook/${process.env.BOT_TOKEN}`;
  const WEBHOOK_URL    = `${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;

  // Register the webhook with Telegram
  await bot.telegram.setWebhook(WEBHOOK_URL);
  console.log(`✅ Webhook set: ${WEBHOOK_URL}`);

  // Mount the webhook callback
  app.use(WEBHOOK_PATH, (req, res) => bot.handleUpdate(req.body, res));

  app.listen(PORT, () => {
    console.log(`🌐 Server listening on port ${PORT}`);
  });
}

// ── Long-polling fallback (used locally when WEBHOOK_DOMAIN is not set) ───────
async function startPollingServer() {
  // Spin up a minimal HTTP server so Render's health checks still pass
  app.listen(PORT, () => {
    console.log(`🌐 Health-check server on port ${PORT} (long-poll mode)`);
  });

  await bot.launch();
  console.log('🤖 Bot started in long-polling mode');
}

async function startServer() {
  if (process.env.WEBHOOK_DOMAIN) {
    await startWebhookServer();
  } else {
    await startPollingServer();
  }
}

module.exports = { startServer };
