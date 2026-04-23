const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const { bot } = require('./bot');
const { addUser, addChat, isNsfw, markNsfw, unmarkNsfw } = require('./db');

// ── Lazy-load the HuggingFace pipeline ──────────────────────────────────────
let classifier = null;

async function getClassifier() {
  if (!classifier) {
    console.log('Loading NSFW detection model (first run may take a moment)…');
    // @xenova/transformers runs in Node without a Python runtime
    const { pipeline } = await import('@xenova/transformers');
    classifier = await pipeline('image-classification', 'Xenova/nsfw-image-detection');
    console.log('✅ Model loaded');
  }
  return classifier;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TMP = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

function tmpPath(name) {
  return path.join(TMP, name);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function getFileUrl(ctx, fileId) {
  const file = await ctx.telegram.getFile(fileId);
  return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
}

async function classifyImage(imagePath) {
  const clf = await getClassifier();
  const results = await clf(imagePath);
  // Model returns [{label:'nsfw',score:0.99},…] – pick the top label
  const top = results.reduce((a, b) => (a.score > b.score ? a : b));
  return top.label === 'nsfw';
}

/**
 * Extract one frame every 10 seconds from a video file using ffmpeg.
 * Returns array of saved frame paths.
 */
function extractFrames(videoPath, outDir) {
  const pattern = path.join(outDir, 'frame_%04d.png');
  try {
    execSync(`ffmpeg -i "${videoPath}" -vf fps=1/10 "${pattern}" -y 2>/dev/null`, {
      timeout: 60_000,
    });
  } catch (e) {
    // ffmpeg not found or failed – skip frames
    console.warn('ffmpeg unavailable, skipping video frame extraction:', e.message);
    return [];
  }
  return fs.readdirSync(outDir)
    .filter((f) => f.startsWith('frame_'))
    .map((f) => path.join(outDir, f));
}

async function classifyVideo(videoPath, fileId) {
  if (await isNsfw(fileId)) return true;

  const frameDir = tmpPath(`frames_${Date.now()}`);
  fs.mkdirSync(frameDir, { recursive: true });

  const frames = extractFrames(videoPath, frameDir);
  let detected = false;

  for (const frame of frames) {
    if (await classifyImage(frame)) {
      detected = true;
      break;
    }
  }

  // Clean up frames
  fs.rmSync(frameDir, { recursive: true, force: true });
  return detected;
}

async function sendNsfwAlert(ctx) {
  const chatType = ctx.chat.type; // 'supergroup' | 'group' | 'private' | 'channel'
  if (chatType === 'supergroup' || chatType === 'group') {
    try { await ctx.deleteMessage(); } catch (_) {}
    try { await ctx.reply('🚫 NSFW content detected and removed.'); } catch (_) {}
    await addChat(ctx.chat.id);
  } else {
    await ctx.reply('⚠️ NSFW Image detected.');
  }
}

// ── /start command ───────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  const { id, username } = ctx.from;
  await addUser(id, username || 'None');

  await ctx.reply(
    'Hello! I am a bot that detects NSFW (Not Safe for Work) images.\n\n' +
    'Send me an image to check if it is NSFW or not.\n' +
    'In groups, make me an admin with delete-message rights and I will automatically delete NSFW content.',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 Support Chat', url: 'https://t.me/VivaanSupport' },
            { text: '📢 News Channel', url: 'https://t.me/VivaanUpdates' },
          ],
        ],
      },
    }
  );
});

// ── Media handler ─────────────────────────────────────────────────────────────

bot.on(['photo', 'sticker', 'animation', 'video'], async (ctx) => {
  try {
    const msg = ctx.message;

    // ── Photo ────────────────────────────────────────────────────────────────
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1]; // highest resolution
      const fileId = photo.file_id;

      if (await isNsfw(fileId)) { await sendNsfwAlert(ctx); return; }

      const url = await getFileUrl(ctx, fileId);
      const dest = tmpPath(`photo_${Date.now()}.jpg`);
      await downloadFile(url, dest);

      const nsfw = await classifyImage(dest);
      fs.unlinkSync(dest);

      if (nsfw) { await markNsfw(fileId); await sendNsfwAlert(ctx); }
      else { await unmarkNsfw(fileId); }
      return;
    }

    // ── Sticker ──────────────────────────────────────────────────────────────
    if (msg.sticker) {
      const fileId = msg.sticker.file_id;
      if (await isNsfw(fileId)) { await sendNsfwAlert(ctx); return; }

      const url = await getFileUrl(ctx, fileId);

      if (msg.sticker.is_animated || msg.sticker.is_video) {
        const dest = tmpPath(`sticker_${Date.now()}.mp4`);
        await downloadFile(url, dest);
        const nsfw = await classifyVideo(dest, fileId);
        fs.unlinkSync(dest);
        if (nsfw) { await markNsfw(fileId); await sendNsfwAlert(ctx); }
        else { await unmarkNsfw(fileId); }
      } else {
        const dest = tmpPath(`sticker_${Date.now()}.png`);
        await downloadFile(url, dest);
        const nsfw = await classifyImage(dest);
        fs.unlinkSync(dest);
        if (nsfw) { await markNsfw(fileId); await sendNsfwAlert(ctx); }
        else { await unmarkNsfw(fileId); }
      }
      return;
    }

    // ── Animation (GIF) ──────────────────────────────────────────────────────
    if (msg.animation) {
      const fileId = msg.animation.file_id;
      if (await isNsfw(fileId)) { await sendNsfwAlert(ctx); return; }

      const url = await getFileUrl(ctx, fileId);
      const dest = tmpPath(`gif_${Date.now()}.mp4`);
      await downloadFile(url, dest);
      const nsfw = await classifyVideo(dest, fileId);
      fs.unlinkSync(dest);
      if (nsfw) { await markNsfw(fileId); await sendNsfwAlert(ctx); }
      else { await unmarkNsfw(fileId); }
      return;
    }

    // ── Video ────────────────────────────────────────────────────────────────
    if (msg.video) {
      const fileId = msg.video.file_id;
      if (await isNsfw(fileId)) { await sendNsfwAlert(ctx); return; }

      const url = await getFileUrl(ctx, fileId);
      const dest = tmpPath(`video_${Date.now()}.mp4`);
      await downloadFile(url, dest);
      const nsfw = await classifyVideo(dest, fileId);
      fs.unlinkSync(dest);
      if (nsfw) { await markNsfw(fileId); await sendNsfwAlert(ctx); }
      else { await unmarkNsfw(fileId); }
    }
  } catch (err) {
    console.error('Error processing media:', err);
  }
});
