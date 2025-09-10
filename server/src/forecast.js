// تقديرات baseline فقط (ليست تنبؤات حتمية)
export function empiricalPGE(values, t) {
  if (!values.length) return 0;
  let k = 0;
  for (const v of values) if (v >= t) k++;
  return k / values.length;
}
export function makeSummary(values) {
  const n = values.length;
  const mean = n ? values.reduce((a,b)=>a+b,0)/n : 0;
  const thresholds = [1.2, 1.5, 2, 3, 5, 10, 20];
  const rows = thresholds.map(t => {
    const p = empiricalPGE(values, t);
    const exp = 1 / t; // baseline fair model
    const se = Math.sqrt(Math.max(1e-9, exp*(1-exp)/Math.max(1,n)));
    const z = (p - exp) / (se || 1);
    return { t, p, exp, z };
  });
  // quantiles تقريبية
  const qs = [0.5, 0.25, 0.10];
  const candT = [1.1,1.2,1.3,1.4,1.5,1.7,2,2.5,3,4,5,7,10,15,20];
  const quant = qs.map(q=>{
    let best = candT[candT.length-1];
    for (const t of candT) { if (empiricalPGE(values, t) >= q) { best = t; break; } }
    return { q, t: best };
  });
  return { n, mean, rows, quant };
}
