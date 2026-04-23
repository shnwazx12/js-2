const { MongoClient } = require('mongodb');
const { mongoUri: MONGO_URI } = require('./port');

let db;
let client;

async function connectDB() {
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db('nsfw');
  console.log('✅ Connected to MongoDB');
}

function getDB() {
  if (!db) throw new Error('DB not connected yet');
  return db;
}

// ── Collections ─────────────────────────────────────────────────────────────

async function addUser(userId, username) {
  const users = getDB().collection('users');
  await users.updateOne(
    { user_id: userId },
    { $set: { username } },
    { upsert: true }
  );
}

async function addChat(chatId) {
  const chats = getDB().collection('chats');
  await chats.updateOne(
    { chat_id: chatId },
    { $set: { chat_id: chatId } },
    { upsert: true }
  );
}

async function isNsfw(fileId) {
  const files = getDB().collection('files');
  const doc = await files.findOne({ file_id: fileId });
  return doc ? doc.nsfw : false;
}

async function markNsfw(fileId) {
  const files = getDB().collection('files');
  await files.updateOne(
    { file_id: fileId },
    { $set: { nsfw: true } },
    { upsert: true }
  );
}

async function unmarkNsfw(fileId) {
  const files = getDB().collection('files');
  await files.updateOne(
    { file_id: fileId },
    { $set: { nsfw: false } },
    { upsert: true }
  );
}

module.exports = { connectDB, getDB, addUser, addChat, isNsfw, markNsfw, unmarkNsfw };
