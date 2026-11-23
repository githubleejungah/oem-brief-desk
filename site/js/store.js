// 상담 저장 · 단계 바꾸기. 저장소는 주입한다(브라우저 localStorage, 시험은 메모리).
import { suggest, finalizeMissing } from './engine.js';

export const KEY = 'oem-brief-desk:v2';
export const STAGES = ['inquiry', 'review', 'proposal', 'sample', 'won', 'hold'];

// F4 상태 기계. proposal 은 confirm() 으로만 들어간다.
const NEXT = {
  inquiry: ['review'],
  review: ['hold'],
  proposal: ['sample', 'hold'],
  sample: ['won', 'hold'],
  hold: ['review'],
  won: [],
};

export function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

export function createStore(storage) {
  let state = { seq: 0, briefs: [] };
  try {
    const raw = storage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch (_) {
    /* 저장소를 못 쓰면 메모리로만 */
  }
  const persist = () => {
    try { storage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* 무시 */ }
  };
  const nowIso = (now) => (now || new Date()).toISOString();
  const find = (id) => state.briefs.find((b) => b.id === id);

  function log(rec, from, to, now) {
    rec.history.push({ at: nowIso(now), from, to });
  }

  return {
    all: () => state.briefs,
    get: find,
    // AC-05: 저장(문의) → 제안 계산 → 검토
    submit(brief, lang, data, { askedOnce = true, now } = {}) {
      state.seq += 1;
      const id = `B-${String(state.seq).padStart(4, '0')}`;
      const final = finalizeMissing(brief);
      const rec = { id, lang, brief: final, askedOnce, suggestion: null, decision: null, stage: 'inquiry', history: [] };
      log(rec, null, 'inquiry', now);
      state.briefs.push(rec);
      rec.suggestion = suggest(final, data, now || new Date());
      rec.stage = 'review';
      log(rec, 'inquiry', 'review', now);
      persist();
      return rec;
    },
    canMove: (id, to) => {
      const r = find(id);
      return !!r && NEXT[r.stage].includes(to);
    },
    move(id, to, now) {
      const r = find(id);
      if (!r || !NEXT[r.stage].includes(to)) return false;
      log(r, r.stage, to, now);
      r.stage = to;
      persist();
      return true;
    },
    // AC-19 · 20: 3칸이 다 있어야 확정
    canConfirm(decision) {
      return !!(decision && decision.formulaId && String(decision.unitPrice || '').trim() && String(decision.dueDate || '').trim());
    },
    confirm(id, decision, now) {
      const r = find(id);
      if (!r || r.stage !== 'review' || !this.canConfirm(decision)) return false;
      r.decision = { ...decision, confirmedAt: nowIso(now) };
      log(r, 'review', 'proposal', now);
      r.stage = 'proposal';
      persist();
      return true;
    },
    // AC-29: 지우고 시연 상담만 다시
    reset(seed, data, now) {
      state = { seq: 0, briefs: [] };
      for (const s of seed) this.submit(s.brief, s.lang, data, { askedOnce: true, now });
      persist();
    },
  };
}
