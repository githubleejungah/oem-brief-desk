// 규칙 기반 모의 AI 엔진. 브라우저와 채점 스크립트(Node)가 같이 쓴다.
// 이 파일은 영업 확정값(decision)을 절대 쓰지 않는다(AC-18).

export const REQUIRED = ['category', 'countries', 'qty', 'month'];
export const TBD = 'TBD';
export const KNOWN_COUNTRIES = ['KR', 'US', 'JP'];
export const CATEGORIES = ['sun', 'skin', 'hairbody', 'makeup'];

export function isEmpty(brief, field) {
  const v = brief[field];
  if (v === undefined || v === null || v === TBD) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === '';
}

// AC-03: 빈 필수 칸 목록
export function checkRequired(brief) {
  return REQUIRED.filter((f) => isEmpty(brief, f));
}

// AC-04: 두 번째 제출 뒤 남은 빈 필수 칸은 '미정'
export function finalizeMissing(brief) {
  const out = { ...brief };
  for (const f of checkRequired(brief)) out[f] = TBD;
  return out;
}

const INJECTION = [
  /이전\s*(의\s*)?(지시|명령|규칙).{0,10}(무시|잊)/,
  /(지시|규칙|명령).{0,6}무시하고/,
  /ignore\s+(all\s+|the\s+|any\s+)?(previous|prior|above)\s+(instructions|rules)/i,
  /system\s*prompt/i,
  /(단가|가격|price).{0,12}(0\s*원|\$\s*0\b|free|무료)/i,
];

export function detectInjection(text) {
  const t = String(text || '');
  return INJECTION.some((re) => re.test(t));
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/g;

// AC-28: 연락처처럼 보이는 글자 가리기
export function maskContacts(text) {
  return String(text || '').replace(EMAIL, '[가림]').replace(PHONE, '[가림]');
}

export function hasContact(text) {
  const t = String(text || '');
  return new RegExp(EMAIL.source).test(t) || new RegExp(PHONE.source).test(t);
}

function tagHits(formula, text) {
  const t = String(text || '').toLowerCase();
  const hits = [];
  for (const group of formula.tags) {
    if (group.some((w) => t.includes(w.toLowerCase()))) hits.push({ ko: group[0], en: group.find((w) => /^[a-z]/i.test(w)) || group[0] });
  }
  return hits;
}

function addWeeks(today, weeks) {
  const d = new Date(today.getTime());
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function ym(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// AC-08~11: 처방 후보 최대 3개(이유 · 표시) 또는 연구소 요청
export function pickFormulas(brief, formulas, today) {
  const countries = Array.isArray(brief.countries) ? brief.countries : [];
  const text = `${brief.concept || ''} ${brief.container || ''}`;
  const qty = brief.qty === TBD ? null : Number(brief.qty);

  const pool = formulas.filter(
    (f) => f.category === brief.category && countries.length > 0 && countries.every((c) => f.countries.includes(c))
  );

  const scored = pool.map((f) => {
    const hits = tagHits(f, text);
    const moqOk = qty !== null && !Number.isNaN(qty) && qty >= f.moq;
    return { f, hits, moqOk };
  });

  scored.sort((a, b) => b.hits.length - a.hits.length || Number(b.moqOk) - Number(a.moqOk) || a.f.weeks[0] - b.f.weeks[0]);

  return scored.slice(0, 3).map(({ f, hits }) => {
    const reasons = [{ k: 'cat' }, { k: 'country', v: countries.join(', ') }];
    reasons.push(hits.length ? { k: 'tags', v: hits } : { k: 'noTags' });
    const flags = [];
    if (qty === null || Number.isNaN(qty)) flags.push({ k: 'qtyTbd' });
    else if (qty < f.moq) flags.push({ k: 'moqUnder', v: f.moq });
    const from = ym(addWeeks(today, f.weeks[0]));
    const to = ym(addWeeks(today, f.weeks[1]));
    if (brief.month && brief.month !== TBD && to > brief.month) flags.push({ k: 'late', v: brief.month });
    return { id: f.id, reasons, flags, ship: { from, to }, weeks: f.weeks, moq: f.moq };
  });
}

// AC-12~16: 나라별 확인 항목
export function pickChecks(brief, checks) {
  const countries = Array.isArray(brief.countries) ? brief.countries : [];
  const out = [];
  for (const c of countries) {
    if (!KNOWN_COUNTRIES.includes(c)) {
      out.push({ country: c, k: 'otherCountry', items: [] });
      continue;
    }
    const general = checks.filter((x) => x.country === c && x.categories.includes('*'));
    const specific = checks.filter((x) => x.country === c && x.categories.includes(brief.category));
    const items = [...general, ...specific].filter((x) => x.source && x.source.url).map((x) => x.id);
    out.push({ country: c, k: specific.length ? 'ok' : 'noBasis', items });
  }
  return out;
}

// 연구소 신규 개발 요청 초안: 브랜드명 · 담당자 · 메일을 넣지 않는다(AC-28)
export function labRequest(brief) {
  return {
    category: brief.category || TBD,
    countries: brief.countries || [],
    needs: maskContacts(brief.concept),
    container: maskContacts(brief.container),
    qty: brief.qty ?? TBD,
    month: brief.month ?? TBD,
  };
}

// 전체 제안. 입력 brief 는 바꾸지 않는다.
export function suggest(brief, data, today = new Date()) {
  const candidates = CATEGORIES.includes(brief.category) ? pickFormulas(brief, data.formulas, today) : [];
  const notes = [];
  if (detectInjection(`${brief.concept || ''} ${brief.container || ''} ${brief.channel || ''}`)) notes.push({ k: 'injection' });
  return {
    candidates,
    labRequest: candidates.length === 0 ? labRequest(brief) : null,
    checks: pickChecks(brief, data.checks),
    notes,
  };
}
