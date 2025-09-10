import express from 'express';
import cors from 'cors';
import { Telegraf, Markup } from 'telegraf';
import { store } from './storage.js';
import { makeSummary } from './forecast.js';

const PORT = process.env.PORT || 3000;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const BOT_TOKEN = process.env.BOT_TOKEN;

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API: جمع عينات من الإضافة
app.post('/api/ingest', (req, res) => {
  const { sessionId, ts, value, roundId, source='ext' } = req.body || {};
  if (!sessionId || !Number.isFinite(value)) return res.status(400).json({ ok:false, error:'bad payload' });
  store.add(sessionId, { ts: ts||Date.now(), value, roundId, source });
  res.json({ ok:true });
});

// API: ملخص/آخر قيم
app.get('/api/summary', (req, res) => {
  const { sessionId } = req.query;
  const s = store.get(sessionId);
  if (!s) return res.json({ ok:true, data:{ n:0 } });
  const values = s.items.map(x=>x.value).filter(Number.isFinite);
  res.json({ ok:true, data: { sessionId, ...store.summary(sessionId), stats: makeSummary(values) } });
});
app.get('/api/last', (req, res) => {
  const { sessionId } = req.query;
  const data = store.lastN(sessionId, 100);
  res.json({ ok:true, data });
});

// صفحة الهاتف
app.use('/phone', express.static(new URL('../../web', import.meta.url).pathname));
app.get('/', (_, res)=>res.send('OK'));

// تيليجرام
const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;
if (bot) {
  bot.start(async (ctx) => {
    const userId = String(ctx.from.id);
    const sessionId = userId; // تبسيط: جلسة لكل مستخدم
    store.ensure(sessionId);
    const phoneUrl = `${APP_BASE_URL}/phone/index.html?session=${encodeURIComponent(sessionId)}`;
    await ctx.reply(
      'أهلاً! هذه جلستك التحليلية.\n- ثبّت إضافة كروم ثم ابدأ الالتقاط على صفحة اللعبة.\n- افتح شاشة الهاتف:',
      Markup.inlineKeyboard([
        [Markup.button.url('فتح شاشة الهاتف', phoneUrl)],
        [Markup.button.callback('Settings', `settings:${sessionId}`)],
        [Markup.button.callback('Ready', `ready:${sessionId}`)]
      ])
    );
  });

  bot.action(/^settings:(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    const url = `${APP_BASE_URL}`;
    const s = store.summary(sessionId);
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `Session: ${sessionId}\nServer URL للإضافة: ${url}\nSamples: ${s.n} Mean: ${Number(s.mean||0).toFixed(2)}x Last: ${Number(s.last||0).toFixed(2)}x`,
      Markup.inlineKeyboard([
        [Markup.button.url('Open Phone Screen', `${APP_BASE_URL}/phone/index.html?session=${encodeURIComponent(sessionId)}`)],
        [Markup.button.callback('Back', `back:${sessionId}`)]
      ])
    );
  });

  bot.action(/^ready:(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    const s = store.get(sessionId);
    const values = (s?.items||[]).map(x=>x.value).filter(Number.isFinite);
    const stats = makeSummary(values);
    await ctx.answerCbQuery();
    await ctx.reply(
      `Ready.\nSamples=${stats.n}\nMean=${(stats.mean||0).toFixed(2)}x\nq50≈${stats.quant[0].t}x q75≈${stats.quant[1].t}x q90≈${stats.quant[2].t}x`
    );
  });

  // Webhook أو Polling
  const webhook = process.env.WEBHOOK_URL;
  if (webhook) {
    await bot.telegram.setWebhook(webhook);
    app.use(bot.webhookCallback('/webhook'));
    console.log('Webhook set:', webhook);
  } else {
    bot.launch().then(()=>console.log('Bot polling launched')).catch(console.error);
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
} else {
  console.warn('BOT_TOKEN not set; Telegram disabled.');
}

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
