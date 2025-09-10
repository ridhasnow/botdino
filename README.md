# Telegram Crash Analyst Bot

مكونات:
- `server/` بوت تيليجرام (Telegraf) + API لتجميع النتائج من الإضافة + تخزين TTL 24 ساعة.
- `extension/` إضافة كروم لالتقاط مشهد اللعبة:
  - Mode A: قراءة DOM (نص يحتوي "x").
  - Mode B: OCR على لقطة الشاشة باستخدام `chrome.tabCapture` + Offscreen Document + Tesseract.
- `web/` شاشة عرض "هاتف" متزامنة وإحصاءات (P(M≥t), Z-score, quantiles).

تحذير:
- لا يوجد "توقع 99%" مضمون. اللوحة تعطي تقديرات واحتمالات ورصد انحرافات فقط. استخدامها للغش مسؤوليتك.

## تشغيل محليًا

1) نسخ الريبو وتثبيت السيرفر:
```bash
cd server
cp .env.example .env
# ضع BOT_TOKEN=... و(اختياري) WEBHOOK_URL=https://your-domain.com/webhook
npm i
npm run dev
```

- إن وضعت `WEBHOOK_URL` سيعمل Webhook، وإلا سيشتغل Long Polling تلقائيًا.

2) تحميل إضافة كروم:
- افتح `chrome://extensions` → فعّل Developer mode → Load unpacked → اختر مجلد `extension/`.

3) إعداد الإضافة:
- من أيقونة الإضافة → افتح الـPopup → ضع Server URL (مثلاً: `http://localhost:3000`).
- اضغط "Start Capture" على صفحة اللعبة:
  - اختر ROI (منطقة المضاعِف/النتيجة) بالسحب.
  - اختر Mode A أو Mode B.
  - اتركه يجمع لساعات. ستظهر نسبة التقدم وزر "Ready".
- عند الضغط "Ready" تُرسل الإحصاءات للبوت وتُغلق الجلسة (مع بقاء البيانات 24 ساعة).

4) شاشة “الهاتف”:
- افتح `http://localhost:3000/phone?session=<SESSION_ID>` (سيمنحك البوت الرابط عند /start).
- تعرض آخر النتائج، إحصاءات، وتقديرات baseline.

## متغيرات البيئة (server/.env)

- `BOT_TOKEN` توكن بوت تيليجرام.
- `WEBHOOK_URL` رابط عام https (اختياري). لو موجود سيُفعّل Webhook تلقائيًا.
- `APP_BASE_URL` الأساس العام للروابط التي يرسلها البوت (مثلاً `https://your-domain.com`).
- `SESSION_TTL_HOURS` افتراضي 24.

## أوامر تيليجرام المدعومة

- `/start` إنشاء/استرجاع Session ID + زر Settings + رابط شاشة الهاتف.
- زر Settings:
  - يعطيك Server URL لاستخدامه في الإضافة.
  - يظهر حالة الجلسة (عدد العينات، آخر قيمة).
- زر Ready:
  - يختم جلسة الدراسة ويرسل لك ملخصًا.

## ملاحظات تقنية

- الإضافة تستخدم:
  - DOM-reader: `MutationObserver` يبحث عن نص مثل `12.34x`.
  - OCR-reader: `chrome.tabCapture` لتدفق الفيديو → Offscreen document يشغّل Tesseract (wasm) → قراءة الأرقام.
- الحفظ:
  - جانب الإضافة: `chrome.storage.local` مع ختم وقت للاحتفاظ المؤقت.
  - جانب السيرفر: ذاكرة + snapshot دوري على ملف JSON (اختياري) + TTL 24 ساعة.
- التزامن "لحظة بلحظة": يتم عبر استعلامات fetch قصيرة المدى (polling) كل 1 ثانية (يمكن تحويلها لـSSE لاحقًا).

## نشر

- أي منصة Node (Railway/Render/Fly/VM خاص).
- افتح المنفذ 3000 أو اضبط `PORT`.
- عيّن `BOT_TOKEN` و`APP_BASE_URL` و(اختياري) `WEBHOOK_URL`.
- أعد تحميل الإضافة مع Server URL العام.
