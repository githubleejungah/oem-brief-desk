# 데이터 설계

> 상태: 승인(2026-11-24) · 같은 날 Q13~15 반영 · 근거: [requirements.md](requirements.md)

## 1. 정본 표

정본 = 가장 믿을 원본. 사본은 정본에서만 만들고, 사본을 고쳐 정본에 되돌려 쓰지 않아요.

| 데이터 | 정본 | 주인 | 사본 |
|---|---|---|---|
| 기본 처방 12개(가상) | `site/data/formulas.json` | 연구소(시제품은 지원자가 만든 가상 값) | 화면 후보 카드, 제안서의 처방 줄 |
| 나라별 확인 항목(한국 · 미국 · 일본) | `site/data/checks.json` | 인허가 담당(시제품은 공식 기관 공개 페이지에서 고른 시작 목록) | 제안 화면 · 제안서의 확인 항목 |
| 시연 상담 3건 | `site/data/seed.json` | 지원자 | 초기화할 때 브라우저 저장소로 복사 |
| 상담(입력 · 단계 · 기록 · 영업 확정값) | 보는 사람 브라우저 localStorage `oem-brief-desk:v2` | 영업 담당 | 제안서(보기 · 인쇄 시점의 모습) |
| 화면 문구(한/영) | `site/js/i18n.js` | 지원자 | 없음 |
| 골든셋 12건 이상 | `eval/golden.json` | 지원자(정답 표시한 사람). **고치지 않고 추가만** | 없음 |
| 채점 결과 | `eval/report.json` | 채점 스크립트가 만듦 | README 요약 |

## 2. 구조

### 2-1. 처방 (`formulas.json`, 1개)

| 칸 | 예 | 설명 |
|---|---|---|
| id | `SUN-02` | 분류 앞글자-번호 |
| category | `sun` | sun 선케어 · skin 스킨케어 · hairbody 헤어/바디 · makeup 메이크업 (분류별 3개) |
| name_ko / name_en | 가상 선스틱 베이스 B | 화면 이름, 앞에 '가상' 표시 |
| form | 스틱 | 제형 |
| tags | ["무기자차","끈적임 적음","휴대"] | 효능 · 컨셉 낱말(한/영 같은 뜻 묶음) |
| countries | ["KR","US"] | 판매 가능 국가(가상) |
| moq | 3000 | 최소 주문 수량(개, 가상) |
| weeks | [10, 14] | 개발~출고 기간 범위(주, 가상) |

### 2-2. 확인 항목 (`checks.json`, 1개)

| 칸 | 예 | 설명 |
|---|---|---|
| id | `US-SUN-OTC` | 나라-분류-주제 |
| country | US | KR · US · JP |
| categories | ["sun"] | 해당 분류. `*`는 모든 분류 |
| when | "선크림 효능을 표시할 때" | 해당 조건 설명 |
| text_ko / text_en | 미국에서 선크림은 일반의약품(OTC)으로 따로 확인 | 확인할 내용 |
| source | { name, url } | 공식 기관 링크(필수). 링크 없는 항목은 넣지 않음 |

### 2-3. 상담 (localStorage, 1건)

| 칸 | 설명 |
|---|---|
| id | `B-0001` 순번 |
| lang | ko / en (문의 언어) |
| brief | 입력 칸 10개(브랜드명 · 담당자 이름 · 연락 메일 · 제품 종류 · 효능과 컨셉 · 판매 국가[] · 판매 채널 · 첫 주문 수량 · 출시 희망 월 · 용기 희망). 빈 필수 칸은 `"TBD"`(미정) |
| askedOnce | 되묻기를 했는지(true면 더 묻지 않음) |
| suggestion | 엔진 결과: candidates[≤3]{id, reasons[], flags[]}, labRequest(없으면 null), checks[], notes[] |
| decision | 영업 확정값: formulaId 또는 `LAB`, estPrice(예상 단가 · 가견적, 글), estDue(예상 납기), freeSamples(무상 샘플 횟수, 0 이상 정수), sampleNote(샘플비 안내, 선택), memo, confirmedAt. 엔진은 이 칸을 쓰지 않음 |
| finalPrice | 확정 단가(글). 샘플 확정 뒤 영업이 넣음. 비어 있으면 수주로 못 감 |
| opened | 영업이 처음 연 때 true(문의 → 검토) |
| samples[] | { n(몇 번째), at, paid(무상 횟수 초과 · 동의함), status(pending · done), doneAt }. pending 은 최대 1건 |
| stage | inquiry 문의 · review 검토 · proposal 제안 · sample 샘플 · won 수주 · hold 보류 |
| history[] | { at, from, to } 단계 바꿀 때 1줄, 또는 { at, note } 샘플 요청 · 처리 1줄 |

### 2-4. 골든셋 (`golden.json`, 1건)

| 칸 | 설명 |
|---|---|
| id · brief | 가상 상담 입력 |
| expect.missing | 되물어야 할 필수 칸 목록 |
| expect.formula | 후보 3개 안에 있어야 할 처방 id, 또는 `LAB` |
| expect.checkIds | 나와야 할 확인 항목 id |
| attack | 지시 바꿔치기 · 연락처 넣기 같은 공격 종류(없으면 null) |

## 3. 지키는 규칙

- 실제 회사 이름 · 고객 이름 · 처방 · 가격은 넣지 않아요. 브랜드 이름은 '가상 브랜드 ○○' 꼴이에요.
- 엔진은 `decision` 칸에 쓰지 않아요(AC-18). 영업 화면만 써요.
- 연구소 요청 초안에는 담당자 이름 · 메일 · 전화번호 모양 글자를 넣지 않아요(AC-28).
- 입력 글자는 화면에 일반 글자로만 넣어요(HTML로 실행하지 않음, AC-27).
