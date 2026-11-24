// 화면 문구. 브랜드 화면 · 되묻기 · 제안서는 한/영, 영업 화면은 한국어(AS-2).
export const T = {
  ko: {
    title: '신규 브랜드 상담 데스크',
    sub: '화장품 OEM/ODM 회사 영업 시제품',
    demo: '가상 시연입니다. 실제 연락처를 넣지 마세요.',
    roleBrand: '브랜드 담당자', roleSales: '영업 담당자', reset: '초기화',
    formTitle: '제품 상담 신청', formLead: '만들고 싶은 제품을 알려 주세요. 영업 담당자가 확인한 뒤 제안서를 드려요.',
    brand: '브랜드명', contact: '담당자 이름', email: '연락 메일', category: '제품 종류', concept: '원하는 효능 · 컨셉',
    countries: '판매 국가', channel: '판매 채널', qty: '첫 주문 수량(개)', month: '출시 희망 월', container: '용기 희망',
    required: '필수', choose: '고르세요', submit: '상담 신청', fill: '예시 채우기',
    cat: { sun: '선케어', skin: '스킨케어', hairbody: '헤어 · 바디', makeup: '메이크업', other: '기타' },
    ctry: { KR: '한국', US: '미국', JP: '일본', EU: '유럽', CN: '중국', VN: '베트남' },
    askTitle: '조금만 더 알려 주세요', askLead: '아래 칸이 비어 있어요. 이번 한 번만 여쭤요. 모르면 비워 두셔도 영업 담당자가 연락드려요.',
    askSubmit: '보내기',
    doneTitle: '상담이 접수됐어요', doneLead: '영업 담당자가 확인한 뒤 제안서를 드려요.',
    myList: '내 상담', viewProposal: '제안서 보기', waiting: '영업 확인 중',
    propTitle: '제품 제안서(초안)', propAi: 'AI 제안 — 참고용', propSales: '영업 확정', print: '인쇄', close: '닫기',
    formula: '처방', unitPrice: '단가(원)', dueDate: '납기', ship: '예상 출고', checksTitle: '나라별 확인할 항목',
    checksNote: 'AI 판단이 아니라 확인할 목록입니다.', labTitle: '연구소 신규 개발 요청', lab: '연구소 신규 개발',
    virtual: '가상', tbd: '미정 — 영업 확인 필요',
    estPrice: '예상 단가(가견적, 원)', estNote: '샘플 확정 뒤 정식 견적을 드려요.', estDue: '예상 납기', replyBy: '회신 예정일',
    samples: '샘플 조건', freeN: (n) => `무상 ${n}회`, sampleNote: '샘플비 안내', finalPrice: '확정 단가(원)',
    sampleReq: '샘플 요청', sampleCount: (u, f) => `지금까지 ${u}회 요청 · 무상 ${f}회`,
    samplePending: '샘플 요청 처리 중 — 영업 담당자가 확인해요',
    feeTitle: '유상 샘플 안내', feeLead: (f) => `이번 요청은 무상 ${f}회를 넘어 샘플비가 들 수 있어요.`,
    feeAskSales: '샘플비는 영업 담당자가 따로 안내해요.', agree: '동의하고 요청', cancel: '취소',
  },
  en: {
    title: 'New Brand Inquiry Desk',
    sub: 'Prototype for a cosmetics OEM/ODM sales team',
    demo: 'Demo with virtual data. Do not enter real contact details.',
    roleBrand: 'Brand', roleSales: 'Sales', reset: 'Reset',
    formTitle: 'Product inquiry', formLead: 'Tell us what you want to make. Our sales team will review it and send you a proposal.',
    brand: 'Brand name', contact: 'Contact name', email: 'Email', category: 'Product type', concept: 'Desired benefits / concept',
    countries: 'Target markets', channel: 'Sales channel', qty: 'First order quantity (units)', month: 'Target launch month', container: 'Packaging preference',
    required: 'Required', choose: 'Select', submit: 'Send inquiry', fill: 'Fill example',
    cat: { sun: 'Sun care', skin: 'Skin care', hairbody: 'Hair & body', makeup: 'Makeup', other: 'Other' },
    ctry: { KR: 'Korea', US: 'U.S.', JP: 'Japan', EU: 'EU', CN: 'China', VN: 'Vietnam' },
    askTitle: 'A few more details', askLead: 'These fields are empty. We ask only once — leave them blank if unsure and our sales team will follow up.',
    askSubmit: 'Send',
    doneTitle: 'Inquiry received', doneLead: 'Our sales team will review it and send you a proposal.',
    myList: 'My inquiries', viewProposal: 'View proposal', waiting: 'Under review',
    propTitle: 'Product proposal (draft)', propAi: 'AI suggestion — for reference', propSales: 'Confirmed by sales', print: 'Print', close: 'Close',
    formula: 'Formula', unitPrice: 'Unit price (KRW)', dueDate: 'Delivery date', ship: 'Estimated shipping', checksTitle: 'Items to check by market',
    checksNote: 'A checklist to verify, not an AI judgment.', labTitle: 'New development request to R&D', lab: 'New development by R&D',
    virtual: 'Virtual', tbd: 'TBD — sales will confirm',
    estPrice: 'Estimated unit price (KRW)', estNote: 'A formal quote follows once the sample is approved.', estDue: 'Estimated delivery', replyBy: 'Reply by',
    samples: 'Sample terms', freeN: (n) => `${n} free round${n === 1 ? '' : 's'}`, sampleNote: 'Sample fee note', finalPrice: 'Confirmed unit price (KRW)',
    sampleReq: 'Request a sample', sampleCount: (u, f) => `${u} requested so far · ${f} free`,
    samplePending: 'Sample request in progress — our sales team will follow up',
    feeTitle: 'Paid sample notice', feeLead: (f) => `This request goes beyond the ${f} free round${f === 1 ? '' : 's'} and may be charged.`,
    feeAskSales: 'Our sales team will confirm the sample fee.', agree: 'Agree and request', cancel: 'Cancel',
  },
};

export const STAGE_KO = { inquiry: '문의', review: '검토', proposal: '제안', sample: '샘플', won: '수주', hold: '보류' };

export function reasonText(r, lang) {
  const ko = lang !== 'en';
  switch (r.k) {
    case 'cat': return ko ? '제품 종류 일치' : 'Product type matches';
    case 'country': {
      const names = String(r.v).split(', ').map((c) => T[ko ? 'ko' : 'en'].ctry[c] || c).join(', ');
      return ko ? `판매 국가 지원: ${names}` : `Supports markets: ${names}`;
    }
    case 'tags': return ko ? `효능 · 컨셉 낱말 겹침: ${r.v.map((x) => x.ko).join(', ')}` : `Matching keywords: ${r.v.map((x) => x.en).join(', ')}`;
    case 'noTags': return ko ? '효능 · 컨셉 낱말 겹침 없음' : 'No matching keywords';
    case 'qtyTbd': return ko ? '수량 미정 — 영업 확인' : 'Quantity TBD — sales will confirm';
    case 'moqUnder': return ko ? `최소 주문 수량 미달(${r.v}개) — 영업 확인` : `Below minimum order (${r.v} units) — sales will confirm`;
    case 'late': return ko ? `희망 월(${r.v})보다 늦을 수 있음` : `May be later than target (${r.v})`;
    default: return '';
  }
}

export function checkGroupText(g, lang) {
  const ko = lang !== 'en';
  if (g.k === 'countryTbd') return ko ? '판매 국가 미정 — 영업 확인 뒤 확인 항목을 정함' : 'Target market TBD — items will follow once confirmed';
  if (g.k === 'otherCountry') return ko ? '해외 영업 · 인허가 담당 확인 필요' : 'To be checked by our export / regulatory team';
  if (g.k === 'noBasis') return ko ? '이 제품 종류 전용 항목: 근거 없음 — 인허가 담당 확인' : 'No product-specific item on file — regulatory team will check';
  return '';
}
