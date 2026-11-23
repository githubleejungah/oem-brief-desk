import { checkRequired, TBD } from './engine.js';
import { createStore, STAGES } from './store.js';
import { T, STAGE_KO, reasonText, checkGroupText } from './i18n.js';

const ui = { role: 'brand', lang: 'ko', phase: 'form', draft: {}, missing: [], selected: null, dec: {}, modal: null };
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
    if (id && store.get(id)) ui.selected = id;
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
  const rec = store.submit(b, ui.lang, data, { askedOnce });
  window.__lastSubmitMs = Math.round(performance.now() - t0);
  ui.phase = 'done';
  ui.draft = {};
  ui.missing = [];
  ui.selected = rec.id;
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
        : h('span', { class: 'muted', text: L.waiting }))))));
  return wrap;
}

// ---------- 영업 화면 ----------
function board() {
  return h('div', { class: 'board' }, STAGES.map((s) => {
    const items = store.all().filter((r) => r.stage === s);
    return h('section', { class: `col st-${s}` }, h('h3', {}, STAGE_KO[s], h('span', { class: 'count', text: String(items.length) })),
      items.map((r) => h('button', { class: `tile${ui.selected === r.id ? ' sel' : ''}`, onclick: () => {
        ui.selected = r.id; render();
        if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('.detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } },
        h('span', { class: 'mono', text: r.id }), h('strong', { text: r.brief.brand || '—' }),
        h('span', { class: 'muted', text: `${T.ko.cat[r.brief.category] || '—'} · ${(r.brief.countries === TBD ? ['미정'] : r.brief.countries || []).join(', ')}` }),
        r.suggestion && r.suggestion.labRequest ? h('span', { class: 'badge warn', text: '연구소 요청' }) : null,
        r.lang === 'en' ? h('span', { class: 'badge', text: 'EN' }) : null)));
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
    r.suggestion.checks.map((g) => h('div', { class: 'cgroup' }, h('strong', { text: L.ctry[g.country] || g.country }),
      h('ul', {}, g.items.map((id) => {
        const c = data.checks.find((x) => x.id === id);
        return h('li', {}, lang === 'en' ? c.text_en : c.text_ko, ' ', h('a', { href: c.source.url, target: '_blank', rel: 'noopener', text: `[${c.source.name}]` }));
      }), checkGroupText(g, lang) ? h('li', { class: 'warnline', text: checkGroupText(g, lang) }) : null))));
}

function salesDetail() {
  const r = store.get(ui.selected);
  if (!r) return h('aside', { class: 'detail empty' }, h('p', { class: 'muted', text: '왼쪽 보드에서 상담을 고르세요.' }));
  const b = r.brief;
  const hold = r.stage === 'hold';
  const locked = r.stage !== 'review';
  const d = (ui.dec[r.id] ||= { formulaId: '', unitPrice: '', dueDate: '', memo: '' });
  const view = r.decision || d;
  const rows = [['brand', b.brand], ['contact', b.contact], ['email', b.email], ['category', T.ko.cat[b.category] || b.category],
    ['countries', b.countries], ['channel', b.channel], ['qty', b.qty], ['month', b.month], ['container', b.container], ['concept', b.concept]];
  const stageBtns = [];
  if (hold) stageBtns.push(h('button', { onclick: () => { store.move(r.id, 'review'); render(); } }, '재개 → 검토'));
  else {
    if (store.canMove(r.id, 'sample')) stageBtns.push(h('button', { onclick: () => { store.move(r.id, 'sample'); render(); } }, '샘플로'));
    if (store.canMove(r.id, 'won')) stageBtns.push(h('button', { onclick: () => { store.move(r.id, 'won'); render(); } }, '수주로'));
    if (store.canMove(r.id, 'hold')) stageBtns.push(h('button', { class: 'ghost', onclick: () => { store.move(r.id, 'hold'); render(); } }, '보류'));
  }
  const canC = !locked && store.canConfirm(d);
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
        h('label', { class: 'field' }, h('span', { class: 'lab', text: '단가(원/개)' }),
          h('input', { value: view.unitPrice || '', disabled: locked, oninput: (e) => { d.unitPrice = e.target.value; syncConfirm(); } })),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: '납기' }),
          h('input', { type: 'date', value: view.dueDate || '', disabled: locked, onchange: (e) => { d.dueDate = e.target.value; render(); } })),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: '메모' }),
          h('input', { value: view.memo || '', disabled: locked, oninput: (e) => { d.memo = e.target.value; } }))),
      h('div', { class: 'row' },
        h('button', { id: 'confirmBtn', class: 'primary', disabled: !canC, onclick: () => { if (store.confirm(r.id, d)) render(); } }, '확정 → 제안서'),
        r.decision ? h('button', { onclick: () => { ui.modal = r.id; render(); } }, '제안서 보기') : null,
        stageBtns),
      !locked ? null : h('p', { class: 'muted', text: r.decision ? '확정됨. 단계만 바꿀 수 있어요.' : '' })),
    h('details', {}, h('summary', { text: `기록 ${r.history.length}줄` }),
      h('ol', { class: 'hist' }, r.history.map((x) => h('li', { text: `${x.at.slice(0, 16).replace('T', ' ')}  ${x.from ? STAGE_KO[x.from] : '—'} → ${STAGE_KO[x.to]}` })))));
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
function proposal() {
  const r = store.get(ui.modal);
  if (!r || !r.decision) return null;
  const lang = r.lang;
  const L = T[lang];
  const c = r.suggestion.candidates.find((x) => x.id === r.decision.formulaId);
  return h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
    h('article', { class: 'paper' },
      h('div', { class: 'paper-h' }, h('h2', { text: L.propTitle }), h('span', { class: 'badge', text: L.virtual })),
      h('p', { class: 'muted', text: `${r.id} · ${r.brief.brand || ''}` }),
      h('section', { class: 'p-sales' }, h('h3', { text: L.propSales }),
        h('dl', { class: 'kv' },
          h('dt', { text: L.formula }), h('dd', { text: fname(r.decision.formulaId, lang) }),
          h('dt', { text: L.unitPrice }), h('dd', { text: r.decision.unitPrice }),
          h('dt', { text: L.dueDate }), h('dd', { text: r.decision.dueDate }))),
      h('section', { class: 'p-ai' }, h('h3', { text: L.propAi }),
        c ? h('ul', {}, c.reasons.concat(c.flags).map((x) => h('li', { text: reasonText(x, lang) })), h('li', { text: `${L.ship}: ${c.ship.from} ~ ${c.ship.to}` })) : null,
        r.decision.formulaId === 'LAB' ? h('p', { text: L.labTitle }) : null,
        checksBlock(r, lang)),
      h('div', { class: 'row noprint' }, h('button', { class: 'primary', onclick: () => window.print() }, L.print),
        h('button', { onclick: () => { ui.modal = null; render(); } }, L.close))));
}

function render() {
  const root = document.getElementById('app');
  document.documentElement.lang = ui.lang;
  root.replaceChildren(header(), h('p', { class: 'demo', text: t().demo }), ui.role === 'brand' ? brandView() : salesView());
  const m = ui.modal ? proposal() : null;
  if (m) root.append(m);
}

boot();
