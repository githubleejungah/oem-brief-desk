// 골든셋 채점(AC-26). 실행: node eval/run.mjs
// 주의: 규칙과 시험 사례를 같은 사람이 만들었다. 점수는 실제 성능이 아니다(AS-3).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkRequired, finalizeMissing, suggest, hasContact } from '../site/js/engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(here, p), 'utf8'));
const data = { formulas: read('../site/data/formulas.json'), checks: read('../site/data/checks.json') };
const golden = read('golden.json');
const TODAY = new Date('2026-11-24T00:00:00');

const rows = [];
let shownItems = 0;
let sourcedItems = 0;
for (const g of golden) {
  const missing = checkRequired(g.brief);
  const s = suggest(finalizeMissing(g.brief), data, TODAY);
  const ids = s.candidates.map((c) => c.id);
  const top3 = g.expect.formula === 'LAB' ? s.labRequest !== null : ids.includes(g.expect.formula);
  const ask = JSON.stringify(missing) === JSON.stringify(g.expect.missing);
  const shown = s.checks.flatMap((x) => x.items);
  for (const id of shown) {
    shownItems += 1;
    const c = data.checks.find((x) => x.id === id);
    if (c && c.source && /^https:\/\//.test(c.source.url)) sourcedItems += 1;
  }
  const coverage = g.expect.checkIds.every((id) => shown.includes(id));
  let blocked = null;
  if (g.attack === 'injection') blocked = s.notes.some((n) => n.k === 'injection') && !('decision' in s);
  if (g.attack === 'contact') blocked = s.labRequest !== null && !hasContact(JSON.stringify(s.labRequest));
  rows.push({ id: g.id, note: g.note, top3, ask, coverage, blocked, candidates: ids, lab: s.labRequest !== null });
}

const pct = (n, d) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);
const attacks = rows.filter((r) => r.blocked !== null);
const report = {
  ranAt: new Date().toISOString(),
  today: '2026-11-24',
  cases: rows.length,
  metrics: {
    top3HitPct: pct(rows.filter((r) => r.top3).length, rows.length),
    askAccuracyPct: pct(rows.filter((r) => r.ask).length, rows.length),
    checkSourcePct: pct(sourcedItems, shownItems),
    attackBlockedPct: pct(attacks.filter((r) => r.blocked).length, attacks.length),
  },
  extra: { expectedCheckCoveragePct: pct(rows.filter((r) => r.coverage).length, rows.length), shownCheckItems: shownItems, attackCases: attacks.length },
  caveat: '가상 데이터에 맞춘 규칙을 같은 사람이 만든 시험으로 채점했다. 실제 성능이 아니다.',
  rows,
};
writeFileSync(join(here, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ cases: report.cases, ...report.metrics, ...report.extra }, null, 2));
for (const r of rows.filter((x) => !x.top3 || !x.ask || !x.coverage || x.blocked === false)) console.log('FAIL', r);
