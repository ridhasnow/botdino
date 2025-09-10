// تخزين بسيط بذاكرة مع TTL بالساعة + snapshot اختياري لاحقًا
const ttlHours = parseFloat(process.env.SESSION_TTL_HOURS || '24');
const TTL_MS = ttlHours * 60 * 60 * 1000;

class Store {
  constructor() {
    this.sessions = new Map(); // id -> {created, last, items:[{ts, value, roundId}]}
    setInterval(() => this.prune(), 60_000).unref();
  }
  ensure(id) {
    let s = this.sessions.get(id);
    if (!s) {
      s = { created: Date.now(), last: Date.now(), items: [] };
      this.sessions.set(id, s);
    }
    return s;
  }
  add(id, sample) {
    const s = this.ensure(id);
    s.items.push(sample);
    s.last = Date.now();
    // قلّص الحجم
    if (s.items.length > 100000) s.items.splice(0, s.items.length - 100000);
    return s;
  }
  get(id) { return this.sessions.get(id) || null; }
  summary(id) {
    const s = this.get(id);
    if (!s || s.items.length === 0) return { n: 0 };
    const n = s.items.length;
    const vals = s.items.map(x => x.value).filter(Number.isFinite);
    const mean = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const last = vals[vals.length-1];
    return { n, mean, last, created: s.created, lastTs: s.last };
  }
  lastN(id, k=50) {
    const s = this.get(id);
    if (!s) return [];
    return s.items.slice(-k);
  }
  prune() {
    const now = Date.now();
    for (const [id, s] of this.sessions.entries()) {
      if (now - s.last > TTL_MS) this.sessions.delete(id);
    }
  }
}
export const store = new Store();
