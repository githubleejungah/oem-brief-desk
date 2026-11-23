# 작업 규칙 — oem-brief-desk

## 스택
- 정적 HTML · CSS · JavaScript(ES 모듈), 빌드 없음. GitHub Pages(`site/`).
- 시험 · 채점: Node 26 기본 시험 도구(`node --test`), `eval/run.mjs`.

## 규칙
- 데이터는 모두 가상. 실제 회사 이름 · 고객 · 처방 · 가격 금지. 공개본에 지원 회사 이름을 쓰지 않는다('OEM/ODM 회사').
- 엔진은 영업 확정값(처방 · 단가 · 납기)을 쓰지 않는다.
- 확인 항목은 공식 출처 링크가 있는 것만. 없으면 '근거 없음 — 인허가 담당 확인'.
- 외부로 보내는 요청 0건. 입력 글자는 textContent로만 넣는다.
- 구조 · 데이터 · 흐름이 바뀌면 같은 커밋에서 docs/도 고친다.

## 자주 쓰는 명령
- 시험: `node --test tests/`
- 채점: `node eval/run.mjs`
- 로컬 보기: `npx serve site` 또는 `python -m http.server -d site 8080`
