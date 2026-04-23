const { Telegraf } = require('telegraf');
const { botToken }  = require('./port');

const bot = new Telegraf(botToken);

module.exports = { bot };
