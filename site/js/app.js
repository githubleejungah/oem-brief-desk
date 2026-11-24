import { checkRequired, TBD } from './engine.js';
import { createStore, STAGES } from './store.js';
import { T, STAGE_KO, reasonText, checkGroupText } from './i18n.js';

const ui = { role: 'brand', lang: 'ko', phase: 'form', draft: {}, missing: [], selected: null, dec: {}, modal: null, feeAsk: null };
let data;
let seed;
let store;

// 입력 글자는 모두 textContent 로만 넣는다(AC-27)
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const t = () => T[ui.lang];
const fname = (id, lang) => {
  if (id === 'LAB') return T[lang].lab;
  const f = data.formulas.find((x) => x.id === id);
  return f ? `${lang === 'en' ? f.name_en : f.name_ko} (${id})` : id;
};
const show = (v, lang = 'ko') => (v === TBD ? T[lang].tbd : Array.isArray(v) ? v.join(', ') : v || '—');

async function boot() {
  const [f, c, s] = await Promise.all(['formulas', 'checks', 'seed'].map((n) => fetch(`data/${n}.json`).then((r) => r.json())));
  data = { formulas: f, checks: c };
  seed = s;
  let storage;
  try { storage = window.localStorage; storage.getItem('x'); } catch (_) { storage = { getItem: () => null, setItem() {}, removeItem() {} }; }
  store = createStore(storage);
  if (store.all().length === 0) store.reset(seed, data);
  applyHash();
  window.addEventListener('hashchange', () => { applyHash(); });
}

// 바로 가기 링크: #sales · #sales=B-0002 · #brand · #brand-en
function applyHash() {
  const hsh = decodeURIComponent(location.hash.slice(1));
  if (hsh.startsWith('sales')) {
    ui.role = 'sales';
    ui.lang = 'ko';
    const id = hsh.split('=')[1];
    if (id && store.get(id)) { ui.selected = id; store.open(id); }
  } else if (hsh.startsWith('brand')) {
    ui.role = 'brand';
    ui.lang = hsh === 'brand-en' ? 'en' : 'ko';
  }
  render();
}

// ---------- 머리 ----------
function header() {
  const L = t();
  return h('header', { class: 'top' },
    h('div', { class: 'brandmark' }, h('strong', { text: L.title }), h('span', { text: L.sub })),
    h('div', { class: 'controls' },
      h('div', { class: 'seg', role: 'group', 'aria-label': 'role' },
        h('button', { class: ui.role === 'brand' ? 'on' : '', onclick: () => { ui.role = 'brand'; render(); } }, L.roleBrand),
        h('button', { class: ui.role === 'sales' ? 'on' : '', onclick: () => { ui.role = 'sales'; ui.lang = 'ko'; render(); } }, L.roleSales)),
      ui.role === 'brand'
        ? h('div', { class: 'seg', role: 'group', 'aria-label': 'language' },
            h('button', { class: ui.lang === 'ko' ? 'on' : '', onclick: () => { ui.lang = 'ko'; render(); } }, '한국어'),
            h('button', { class: ui.lang === 'en' ? 'on' : '', onclick: () => { ui.lang = 'en'; render(); } }, 'English'))
        : null,
      h('button', { class: 'ghost', onclick: () => { store.reset(seed, data); ui.selected = null; ui.phase = 'form'; ui.draft = {}; render(); } }, L.reset)));
}

// ---------- 브랜드 화면 ----------
function field(key, input, req) {
  const L = t();
  return h('label', { class: 'field' }, h('span', { class: 'lab' }, L[key], req ? h('em', { text: ` ${L.required}` }) : null), input);
}

function readForm(form) {
  const fd = new FormData(form);
  const b = { ...ui.draft };
  for (const k of ['brand', 'contact', 'email', 'category', 'concept', 'channel', 'qty', 'month', 'container']) {
    if (fd.has(k)) b[k] = String(fd.get(k) || '').trim();
  }
  if (form.querySelector('[name=countries]')) b.countries = fd.getAll('countries');
  return b;
}

function inputFor(key, b) {
  const L = t();
  if (key === 'category') {
    return h('select', { name: 'category' }, h('option', { value: '', text: L.choose }),
      ['sun', 'skin', 'hairbody', 'makeup', 'other'].map((c) => h('option', { value: c, selected: b.category === c }, L.cat[c])));
  }
  if (key === 'countries') {
    return h('div', { class: 'checks' }, ['KR', 'US', 'JP', 'EU', 'CN', 'VN'].map((c) =>
      h('label', { class: 'chip' }, h('input', { type: 'checkbox', name: 'countries', value: c, checked: (b.countries || []).includes(c) }), L.ctry[c])));
  }
  if (key === 'concept') return h('textarea', { name: 'concept', rows: 3 }, b.concept || '');
  const type = key === 'qty' ? 'number' : key === 'month' ? 'month' : key === 'email' ? 'email' : 'text';
  return h('input', { name: key, type, value: b[key] && b[key] !== TBD ? b[key] : '', min: key === 'qty' ? '1' : null });
}

function doSubmit(b, askedOnce) {
  const t0 = performance.now();
  store.submit(b, ui.lang, data, { askedOnce });
  window.__lastSubmitMs = Math.round(performance.now() - t0);
  ui.phase = 'done';
  ui.draft = {};
  ui.missing = [];
  render();
}

function brandView() {
  const L = t();
  const wrap = h('main', { class: 'brand' });
  if (ui.phase === 'ask') {
    const form = h('form', { class: 'card', onsubmit: (e) => { e.preventDefault(); doSubmit(readForm(e.target), true); } },
      h('h2', { text: L.askTitle }), h('p', { class: 'lead', text: L.askLead }),
      ui.missing.map((k) => field(k, inputFor(k, ui.draft), true)),
      h('div', { class: 'row' }, h('button', { class: 'primary', type: 'submit' }, L.askSubmit)));
    wrap.append(form);
  } else if (ui.phase === 'done') {
    wrap.append(h('div', { class: 'card ok' }, h('h2', { text: L.doneTitle }), h('p', { class: 'lead', text: L.doneLead }),
      h('button', { class: 'ghost', onclick: () => { ui.phase = 'form'; render(); } }, L.formTitle)));
  } else {
    const b = ui.draft;
    const form = h('form', { class: 'card', novalidate: true, onsubmit: (e) => {
      e.preventDefault();
      const nb = readForm(e.target);
      const missing = checkRequired(nb);
      if (missing.length) { ui.draft = nb; ui.missing = missing; ui.phase = 'ask'; render(); return; }
      doSubmit(nb, false);
    } },
      h('h2', { text: L.formTitle }), h('p', { class: 'lead', text: L.formLead }),
      h('div', { class: 'examples' }, seed.map((s, i) => h('button', { type: 'button', class: 'ghost small', onclick: () => {
        ui.lang = s.lang; ui.draft = { ...s.brief }; render();
      } }, `${T[ui.lang].fill} ${i + 1}`))),
      h('div', { class: 'grid' },
        field('brand', inputFor('brand', b)), field('contact', inputFor('contact', b)), field('email', inputFor('email', b)),
        field('category', inputFor('category', b), true), field('channel', inputFor('channel', b)),
        field('qty', inputFor('qty', b), true), field('month', inputFor('month', b), true), field('container', inputFor('container', b))),
      field('countries', inputFor('countries', b), true),
      field('concept', inputFor('concept', b)),
      h('div', { class: 'row' }, h('button', { class: 'primary', type: 'submit' }, L.submit)));
    wrap.append(form);
  }
  // 내 상담(시연: 전체 목록)
  wrap.append(h('section', { class: 'card' }, h('h3', { text: L.myList }),
    h('ul', { class: 'mylist' }, store.all().slice().reverse().map((r) => h('li', {},
      h('span', { class: 'mono', text: r.id }), h('span', { text: r.brief.brand || '—' }),
      r.decision ? h('button', { class: 'small', onclick: () => { ui.modal = r.id; render(); } }, L.viewProposal)
        : h('span', { class: 'muted', text: L.waiting }),
      store.pendingSample(r.id) ? h('span', { class: 'badge warn', text: L.samplePending }) : null)))));
  return wrap;
}

// ---------- 영업 화면 ----------
function board() {
  return h('div', { class: 'board' }, STAGES.map((s) => {
    const items = store.all().filter((r) => r.stage === s);
    return h('section', { class: `col st-${s}` }, h('h3', {}, STAGE_KO[s], h('span', { class: 'count', text: String(items.length) })),
      items.map((r) => h('button', { class: `tile${ui.selected === r.id ? ' sel' : ''}`, onclick: () => {
        ui.selected = r.id; store.open(r.id); render();
        if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('.detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } },
        h('span', { class: 'mono', text: r.id }), h('strong', { text: r.brief.brand || '—' }),
        h('span', { class: 'muted', text: `${T.ko.cat[r.brief.category] || '—'} · ${(r.brief.countries === TBD ? ['미정'] : r.brief.countries || []).join(', ')}` }),
        r.suggestion && r.suggestion.labRequest ? h('span', { class: 'badge warn', text: '연구소 요청' }) : null,
        r.lang === 'en' ? h('span', { class: 'badge', text: 'EN' }) : null,
        store.pendingSample(r.id) ? h('span', { class: 'badge warn', text: '샘플 요청' }) : null)));
  }));
}

function candidateList(r, locked) {
  const s = r.suggestion;
  const d = (ui.dec[r.id] ||= { formulaId: '', unitPrice: '', dueDate: '', memo: '' });
  const opts = s.candidates.map((c, i) => h('label', { class: 'cand' },
    h('input', { type: 'radio', name: `f-${r.id}`, value: c.id, disabled: locked, checked: d.formulaId === c.id, onchange: () => { d.formulaId = c.id; render(); } }),
    h('div', {},
      h('div', { class: 'cand-h' }, h('span', { class: 'rank', text: `${i + 1}` }), h('strong', { text: fname(c.id, 'ko') }), h('span', { class: 'badge', text: '가상' })),
      h('ul', { class: 'reasons' }, c.reasons.map((x) => h('li', { text: reasonText(x, 'ko') }))),
      c.flags.length ? h('ul', { class: 'flags' }, c.flags.map((x) => h('li', { text: reasonText(x, 'ko') }))) : null,
      h('div', { class: 'muted', text: `예상 출고 ${c.ship.from} ~ ${c.ship.to} · 최소 주문 ${c.moq}개(가상)` }))));
  const lab = s.labRequest ? h('div', { class: 'labreq' },
    h('label', { class: 'cand' }, h('input', { type: 'radio', name: `f-${r.id}`, value: 'LAB', disabled: locked, checked: d.formulaId === 'LAB', onchange: () => { d.formulaId = 'LAB'; render(); } }),
      h('div', {}, h('strong', { text: '맞는 처방 없음 → 연구소 신규 개발 요청 초안' }),
        h('dl', { class: 'kv' },
          h('dt', { text: '제품 종류' }), h('dd', { text: T.ko.cat[s.labRequest.category] || show(s.labRequest.category) }),
          h('dt', { text: '판매 국가' }), h('dd', { text: show(s.labRequest.countries) }),
          h('dt', { text: '효능 · 컨셉' }), h('dd', { text: s.labRequest.needs || '—' }),
          h('dt', { text: '용기' }), h('dd', { text: s.labRequest.container || '—' }),
          h('dt', { text: '수량 · 출시 월' }), h('dd', { text: `${show(s.labRequest.qty)} · ${show(s.labRequest.month)}` })),
        h('p', { class: 'muted', text: '브랜드명 · 담당자 · 연락처는 넣지 않았어요.' })))) : null;
  return [opts, lab];
}

function checksBlock(r, lang) {
  const L = T[lang];
  return h('div', { class: 'checksbox' }, h('h4', { text: L.checksTitle }), h('p', { class: 'note', text: L.checksNote }),
    r.suggestion.checks.map((g) => h('div', { class: 'cgroup' }, h('strong', { text: g.country === TBD ? (lang === 'en' ? 'Market' : '판매 국가') : L.ctry[g.country] || g.country }),
      h('ul', {}, g.items.map((id) => {
        const c = data.checks.find((x) => x.id === id);
        return h('li', {}, lang === 'en' ? c.text_en : c.text_ko, ' ', h('a', { href: c.source.url, target: '_blank', rel: 'noopener', text: `[${c.source.name}]` }));
      }), checkGroupText(g, lang) ? h('li', { class: 'warnline', text: checkGroupText(g, lang) }) : null))));
}

function salesDetail() {
  const r = store.get(ui.selected);
  if (!r) return h('aside', { class: 'detail empty' }, h('p', { class: 'muted', text: '왼쪽 보드에서 상담을 고르세요. 처음 연 문의는 검토로 넘어가요.' }));
  const b = r.brief;
  const hold = r.stage === 'hold';
  const locked = r.stage !== 'review';
  // 보류 → 재개로 검토에 돌아오면 지난 확정값을 고칠 초안으로 가져온다
  const blank = { formulaId: '', estPrice: '', estDue: '', freeSamples: '', sampleNote: '', memo: '' };
  const d = (ui.dec[r.id] ||= r.decision ? { ...blank, ...r.decision, freeSamples: String(r.decision.freeSamples) } : { ...blank });
  const view = locked && r.decision ? { ...r.decision, freeSamples: String(r.decision.freeSamples) } : d;
  const isLab = view.formulaId === 'LAB';
  const rows = [['brand', b.brand], ['contact', b.contact], ['email', b.email], ['category', T.ko.cat[b.category] || b.category],
    ['countries', b.countries], ['channel', b.channel], ['qty', b.qty], ['month', b.month], ['container', b.container], ['concept', b.concept]];
  const pending = store.pendingSample(r.id);

  const stageBtns = [];
  if (hold) stageBtns.push(h('button', { onclick: () => { store.move(r.id, 'review'); render(); } }, '재개 → 검토'));
  else {
    if (store.canMove(r.id, 'sample')) stageBtns.push(h('button', { onclick: () => { store.move(r.id, 'sample'); render(); } }, '샘플로'));
    if (r.stage === 'sample') stageBtns.push(h('button', { disabled: !pending, onclick: () => { store.sendRevisedSample(r.id); render(); } }, '수정 샘플 보냄'));
    if (r.stage === 'sample') stageBtns.push(h('button', { id: 'wonBtn', disabled: !store.canMove(r.id, 'won'), onclick: () => { store.move(r.id, 'won'); render(); } }, '수주로'));
    if (store.canMove(r.id, 'hold')) stageBtns.push(h('button', { class: 'ghost', onclick: () => { store.move(r.id, 'hold'); render(); } }, '보류'));
  }
  const canC = !locked && store.canConfirm(d);
  const inp = (label, key, opts = {}) => h('label', { class: 'field' }, h('span', { class: 'lab', text: label }),
    h('input', { value: view[key] || '', disabled: locked, placeholder: opts.ph || '', type: opts.type || 'text', min: opts.min,
      oninput: (e) => { d[key] = e.target.value; syncConfirm(); }, onchange: (e) => { d[key] = e.target.value; syncConfirm(); } }));

  // 샘플 · 확정 단가 구역(제안 · 샘플 · 수주 단계)
  let sampleBox = null;
  if (r.decision && ['proposal', 'sample', 'won', 'hold'].includes(r.stage)) {
    const used = r.samples.length;
    sampleBox = h('div', { class: 'samplebox' },
      h('h4', { text: '샘플 · 확정 단가' }),
      h('p', { text: `샘플 요청 ${used}회 · 무상 ${r.decision.freeSamples}회${r.decision.sampleNote ? ` · 안내: ${r.decision.sampleNote}` : ''}` }),
      pending ? h('p', { class: 'alert', text: `처리 전 샘플 요청 ${pending.n}번째${pending.paid ? '(유상, 브랜드 동의함)' : ''}. ${r.stage === 'proposal' ? "'샘플로'를 누르면 처리돼요." : "'수정 샘플 보냄'을 누르면 처리돼요."}` }) : null,
      ['proposal', 'sample'].includes(r.stage)
        ? h('label', { class: 'field' }, h('span', { class: 'lab', text: '확정 단가(샘플 확정 뒤 정식 견적 · 없으면 수주로 못 가요)' }),
            h('input', { value: r.finalPrice || '', placeholder: '예: 개당 2,450원', oninput: (e) => { store.setFinalPrice(r.id, e.target.value); const w = document.getElementById('wonBtn'); if (w) w.disabled = !store.canMove(r.id, 'won'); } }))
        : (r.finalPrice ? h('p', { text: `확정 단가: ${r.finalPrice}` }) : null));
  }

  return h('aside', { class: 'detail' },
    h('div', { class: 'dhead' }, h('h2', {}, `${r.id} · ${b.brand || '—'}`), h('span', { class: `stage st-${r.stage}`, text: STAGE_KO[r.stage] })),
    h('details', { open: true }, h('summary', { text: '상담 내용' + (r.lang === 'en' ? ' (영어 문의)' : '') }),
      h('dl', { class: 'kv' }, rows.map(([k, v]) => [h('dt', { text: T.ko[k] }), h('dd', { class: v === TBD ? 'tbd' : '', text: show(v) })]))),
    r.suggestion.notes.some((n) => n.k === 'injection')
      ? h('p', { class: 'alert', text: '지시처럼 보이는 문장이 있어 무시했어요. 단가 · 처방 · 납기는 영업만 정해요.' }) : null,
    h('section', { class: 'ai' }, h('h3', { text: 'AI 제안 — 참고용' }), candidateList(r, locked), checksBlock(r, 'ko')),
    h('section', { class: 'sales' }, h('h3', { text: '영업 확정' }),
      hold ? h('p', { class: 'alert', text: '보류 중에는 확정할 수 없어요. 재개하면 검토로 돌아가요.' }) : null,
      h('div', { class: 'grid' },
        h('label', { class: 'field' }, h('span', { class: 'lab', text: '처방(위에서 고르기)' }), h('input', { value: view.formulaId ? fname(view.formulaId, 'ko') : '', readonly: true })),
        inp(isLab ? '예상 단가(개발 뒤 산정이면 그렇게 적기)' : '예상 단가(가견적)', 'estPrice', { ph: isLab ? '예: 개발 후 산정' : '예: 개당 2,300~2,600원' }),
        inp(isLab ? '회신 예정일' : '예상 납기', 'estDue', { type: 'date' }),
        inp('무상 샘플 횟수', 'freeSamples', { type: 'number', min: '0', ph: '예: 2' }),
        inp('샘플비 안내(선택)', 'sampleNote', { ph: '예: 이후 회당 별도 청구, 발주 시 차감' }),
        inp('메모', 'memo')),
      h('div', { class: 'row' },
        h('button', { id: 'confirmBtn', class: 'primary', disabled: !canC, onclick: () => { if (store.confirm(r.id, d)) render(); } }, '확정 → 제안서'),
        r.decision ? h('button', { onclick: () => { ui.modal = r.id; render(); } }, '제안서 보기') : null,
        stageBtns),
      locked && r.decision ? h('p', { class: 'muted', text: '확정됨. 단계와 확정 단가만 바꿀 수 있어요.' } ) : null,
      sampleBox),
    h('details', {}, h('summary', { text: `기록 ${r.history.length}줄` }),
      h('ol', { class: 'hist' }, r.history.map((x) => h('li', { text: `${localTime(x.at)}  ${x.note ? x.note : `${x.from ? STAGE_KO[x.from] : '—'} → ${STAGE_KO[x.to]}`}` })))));
}

// 기록 시각은 보는 사람 컴퓨터 시각(한국이면 한국 시각)으로
function localTime(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function syncConfirm() {
  const r = store.get(ui.selected);
  const btn = document.getElementById('confirmBtn');
  if (r && btn) btn.disabled = !(r.stage === 'review' && store.canConfirm(ui.dec[r.id]));
}

function salesView() {
  return h('main', { class: 'sales-wrap' }, board(), salesDetail());
}

// ---------- 제안서 ----------
function sampleArea(r, L) {
  // 브랜드 화면에서 연 제안서에만 '샘플 요청'을 둔다(AC-37~39)
  if (ui.role !== 'brand' || !['proposal', 'sample'].includes(r.stage)) return null;
  const pending = store.pendingSample(r.id);
  if (pending) return h('p', { class: 'alert', text: L.samplePending });
  if (ui.feeAsk === r.id) {
    return h('div', { class: 'feebox' }, h('strong', { text: L.feeTitle }),
      h('p', { text: L.feeLead(r.decision.freeSamples) }),
      r.decision.sampleNote ? h('p', { text: `${L.sampleNote}: ${r.decision.sampleNote}` }) : h('p', { text: L.feeAskSales }),
      h('div', { class: 'row' },
        h('button', { class: 'primary', onclick: () => { store.requestSample(r.id, { agreeFee: true }); ui.feeAsk = null; render(); } }, L.agree),
        h('button', { onclick: () => { ui.feeAsk = null; render(); } }, L.cancel)));
  }
  return h('div', { class: 'row noprint' },
    h('button', { class: 'primary', disabled: !store.canRequestSample(r.id), onclick: () => {
      if (store.nextSampleIsPaid(r.id)) { ui.feeAsk = r.id; render(); return; }
      store.requestSample(r.id); render();
    } }, L.sampleReq),
    h('span', { class: 'muted', text: L.sampleCount(r.samples.length, r.decision.freeSamples) }));
}

function proposal() {
  const r = store.get(ui.modal);
  if (!r || !r.decision) return null;
  const lang = r.lang;
  const L = T[lang];
  const dc = r.decision;
  const c = r.suggestion.candidates.find((x) => x.id === dc.formulaId);
  return h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
    h('article', { class: 'paper' },
      h('div', { class: 'paper-h' }, h('h2', { text: L.propTitle }), h('span', { class: 'badge', text: L.virtual })),
      h('p', { class: 'muted', text: `${r.id} · ${r.brief.brand || ''}` }),
      h('section', { class: 'p-sales' }, h('h3', { text: L.propSales }),
        h('dl', { class: 'kv' },
          h('dt', { text: L.formula }), h('dd', { text: fname(dc.formulaId, lang) }),
          h('dt', { text: L.estPrice }), h('dd', {}, dc.estPrice, h('br'), h('small', { class: 'muted', text: L.estNote })),
          h('dt', { text: dc.formulaId === 'LAB' ? L.replyBy : L.estDue }), h('dd', { text: dc.estDue }),
          h('dt', { text: L.samples }), h('dd', { text: `${L.freeN(dc.freeSamples)}${dc.sampleNote ? ` · ${dc.sampleNote}` : ''}` }),
          r.stage === 'won' && r.finalPrice ? [h('dt', { text: L.finalPrice }), h('dd', { text: r.finalPrice })] : null)),
      sampleArea(r, L),
      h('section', { class: 'p-ai' }, h('h3', { text: L.propAi }),
        c ? h('ul', {}, c.reasons.concat(c.flags).map((x) => h('li', { text: reasonText(x, lang) })), h('li', { text: `${L.ship}: ${c.ship.from} ~ ${c.ship.to}` })) : null,
        dc.formulaId === 'LAB' ? h('p', { text: L.labTitle }) : null,
        checksBlock(r, lang)),
      h('div', { class: 'row noprint' }, h('button', { onclick: () => window.print() }, L.print),
        h('button', { onclick: () => { ui.modal = null; ui.feeAsk = null; render(); } }, L.close))));
}

function render() {
  const root = document.getElementById('app');
  document.documentElement.lang = ui.lang;
  root.replaceChildren(header(), h('p', { class: 'demo', text: t().demo }), ui.role === 'brand' ? brandView() : salesView());
  const m = ui.modal ? proposal() : null;
  if (m) root.append(m);
}

boot();
