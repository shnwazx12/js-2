# NSFW Detection Telegram Bot (JavaScript)

A JavaScript/Node.js port of the original Python NSFW Detection Bot.  
Uses **Telegraf**, **@xenova/transformers** (runs fully in Node — no Python needed), and **MongoDB**.

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| MongoDB | Atlas (cloud) or local |
| ffmpeg | Optional – needed for video/GIF frame extraction |

---

## Quick Start (Local)

```bash
# 1. Clone / unzip the project
cd nsfw-bot-js

# 2. Install dependencies
npm install

# 3. Copy the env example and fill in your values
cp .env.example .env
# edit .env with your BOT_TOKEN and MONGO_URI

# 4. Run
npm start
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `MONGO_URI` | MongoDB connection string |

---

## Deploy on Render

1. Push this project to a GitHub repository.
2. Go to [render.com](https://render.com) → **New → Blueprint** → connect your repo.  
   Render will detect `render.yaml` automatically.
3. In the Render dashboard add the two secret env vars:
   - `BOT_TOKEN`
   - `MONGO_URI` (use a MongoDB Atlas free-tier URI)
4. Click **Deploy**.

> The `render.yaml` configures it as a **Background Worker** (no web server needed for a long-polling bot).

---

## MongoDB Setup (Atlas Free Tier)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and whitelist `0.0.0.0/0` (or Render's IPs).
3. Copy the **connection string** → paste as `MONGO_URI` in `.env` or Render dashboard.

---

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/stats` | Show total users, chats, and NSFW files detected |

---

## File Structure

```
nsfw-bot-js/
├── src/
│   ├── index.js       # Entry point – starts bot & DB
│   ├── bot.js         # Telegraf client singleton
│   ├── db.js          # MongoDB connection + helpers
│   ├── antinsfw.js    # Media handler + NSFW classification
│   └── stats.js       # /stats command
├── tmp/               # Auto-created – temp media files
├── .env.example
├── .gitignore
├── package.json
├── render.yaml        # Render.com deployment config
└── README.md
```

---

## Credits

Original Python bot: [SkyBotsDeveloper/NSFWDetection](https://github.com/SkyBotsDeveloper/NSFWDetection)  
NSFW model: [Xenova/nsfw-image-detection](https://huggingface.co/Xenova/nsfw-image-detection) (ONNX port of Falconsai)
