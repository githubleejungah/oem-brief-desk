// 상담 저장 · 단계 바꾸기 · 샘플 요청. 저장소는 주입한다(브라우저 localStorage, 시험은 메모리).
import { suggest, finalizeMissing } from './engine.js';

export const KEY = 'oem-brief-desk:v3';
export const STAGES = ['inquiry', 'review', 'proposal', 'sample', 'won', 'hold'];

// F4 상태 기계. inquiry → review 는 open(), proposal 은 confirm() 으로만 들어간다.
const NEXT = {
  inquiry: [],
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

const filled = (v) => String(v ?? '').trim() !== '';
const isCount = (v) => /^\d+$/.test(String(v ?? '').trim());

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
  const log = (rec, from, to, now) => rec.history.push({ at: nowIso(now), from, to });
  const note = (rec, text, now) => rec.history.push({ at: nowIso(now), note: text });
  const pendingOf = (r) => (r && r.samples ? r.samples.find((s) => s.status === 'pending') : undefined);

  const api = {
    all: () => state.briefs,
    get: find,

    // AC-05: 저장(문의) + 제안 계산. 검토로는 옮기지 않는다(AC-33).
    submit(brief, lang, data, { askedOnce = true, now } = {}) {
      state.seq += 1;
      const id = `B-${String(state.seq).padStart(4, '0')}`;
      const final = finalizeMissing(brief);
      const rec = { id, lang, brief: final, askedOnce, opened: false, suggestion: null, decision: null, finalPrice: '', samples: [], stage: 'inquiry', history: [] };
      log(rec, null, 'inquiry', now);
      rec.suggestion = suggest(final, data, now || new Date());
      state.briefs.push(rec);
      persist();
      return rec;
    },

    // AC-33: 영업이 처음 열면 문의 → 검토
    open(id, now) {
      const r = find(id);
      if (!r) return false;
      if (r.stage === 'inquiry') {
        r.opened = true;
        log(r, 'inquiry', 'review', now);
        r.stage = 'review';
        persist();
        return true;
      }
      return false;
    },

    canMove(id, to) {
      const r = find(id);
      if (!r || !NEXT[r.stage].includes(to)) return false;
      if (to === 'won' && !filled(r.finalPrice)) return false; // AC-35
      return true;
    },
    move(id, to, now) {
      const r = find(id);
      if (!api.canMove(id, to)) return false;
      if (to === 'sample') {
        const p = pendingOf(r); // AC-40: 제안 단계에서 '샘플로'면 처리 전 요청을 처리
        if (p) { p.status = 'done'; p.doneAt = nowIso(now); note(r, `샘플 요청 ${p.n}번째 처리`, now); }
      }
      log(r, r.stage, to, now);
      r.stage = to;
      persist();
      return true;
    },

    // AC-19: 처방 · 예상 단가 · 예상 납기 · 무상 샘플 횟수 4칸
    canConfirm(d) {
      return !!(d && filled(d.formulaId) && filled(d.estPrice) && filled(d.estDue) && isCount(d.freeSamples));
    },
    confirm(id, d, now) {
      const r = find(id);
      if (!r || r.stage !== 'review' || !api.canConfirm(d)) return false;
      r.decision = {
        formulaId: d.formulaId, estPrice: String(d.estPrice).trim(), estDue: d.estDue,
        freeSamples: Number(String(d.freeSamples).trim()), sampleNote: String(d.sampleNote || '').trim(), memo: d.memo || '',
        confirmedAt: nowIso(now),
      };
      log(r, 'review', 'proposal', now);
      r.stage = 'proposal';
      persist();
      return true;
    },

    setFinalPrice(id, v) {
      const r = find(id);
      if (!r || !['proposal', 'sample'].includes(r.stage)) return false;
      r.finalPrice = String(v ?? '');
      persist();
      return true;
    },

    // ---- 샘플 요청 (AC-37~40) ----
    pendingSample: (id) => pendingOf(find(id)),
    canRequestSample(id) {
      const r = find(id);
      return !!r && !!r.decision && ['proposal', 'sample'].includes(r.stage) && !pendingOf(r);
    },
    nextSampleIsPaid(id) {
      const r = find(id);
      if (!r || !r.decision) return false;
      return r.samples.length + 1 > r.decision.freeSamples;
    },
    requestSample(id, { agreeFee = false, now } = {}) {
      const r = find(id);
      if (!api.canRequestSample(id)) return false;
      const paid = api.nextSampleIsPaid(id);
      if (paid && !agreeFee) return false; // AC-38: 동의 없으면 0건
      const n = r.samples.length + 1;
      r.samples.push({ n, at: nowIso(now), paid, status: 'pending' });
      note(r, `샘플 요청 ${n}번째${paid ? '(유상, 동의함)' : ''}`, now);
      persist();
      return true;
    },
    sendRevisedSample(id, now) {
      const r = find(id);
      const p = pendingOf(r);
      if (!r || r.stage !== 'sample' || !p) return false;
      p.status = 'done';
      p.doneAt = nowIso(now);
      note(r, `수정 샘플 보냄(${p.n}번째 요청)`, now);
      persist();
      return true;
    },

    // AC-29: 지우고 시연 상담만 다시
    reset(seed, data, now) {
      state = { seq: 0, briefs: [] };
      for (const s of seed) api.submit(s.brief, s.lang, data, { askedOnce: true, now });
      persist();
    },
  };
  return api;
}
