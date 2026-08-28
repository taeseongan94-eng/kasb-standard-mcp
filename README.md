# KASB Standard MCP Server

한국회계기준원(KASB) 회계기준열람서비스(db.kasb.or.kr)의 비공식 API를 감싼 **회계기준서·질의회신 조회 전용 웹 MCP 서버**입니다. Vercel에 배포하여 Claude for Excel, Claude Desktop, Claude Code 등 원격 MCP 클라이언트에서 바로 사용할 수 있습니다.

db.kasb.or.kr는 SPA(Next.js)라 페이지를 그대로 열면 제목만 나오고 본문이 안 나옵니다. 이 서버는 사이트가 내부적으로 쓰는 REST API를 인증 없이 직접 호출해서 조항 원문을 그대로 가져옵니다.

## 핵심 원칙

- **원문 그대로**: 회계기준 조항번호·문구는 학습된 지식이 아니라 이 서버로 실시간 조회한 원문만 인용해야 합니다.
- **조회 전용**: 스냅샷 저장·개정 추적(diff) 기능은 포함하지 않습니다 — 서버리스 환경은 파일 저장이 영구적이지 않아, 그런 워크플로우는 로컬 스크립트로 별도 운영합니다.

---

## MCP 도구

| 도구 | 설명 |
|------|------|
| `search_standard` | 검색어가 어느 기준서에 몇 건 있는지 확인 후, 가장 관련성 높은 기준서에서 매칭 조항 원문 반환 |
| `get_standard_toc` | 기준서 목차(문단 구조) |
| `get_standard_content` | 기준서 전체 또는 특정 검색어 매칭 조항 원문 |
| `search_qna` | 질의회신(신속처리질의, IFRS 해석위원회 회신 등) 검색 + 상위 매칭 전문 |
| `get_qna_detail` | 특정 질의회신 문서번호의 전문 |
| `list_standard_catalog` | 회계기준 전체 카탈로그(98개: K-IFRS 본기준서 41 + 해석서 19, 일반기업회계기준 33장, 기타기준서 4) |

### stdNum 체계
- K-IFRS: 1000번대 (1016=유형자산, 1036=자산손상, 1109=금융상품, 1115=수익인식, 1116=리스 등)
- 일반기업회계기준: 장 번호 그대로 (2=재무제표의 작성과 표시, 10=유형자산 등)

---

## 기술 스택

- **Next.js 15** + **mcp-handler** (Streamable HTTP transport)
- **Vercel** 배포 (서버리스, 서울 리전 고정, Fluid Compute)
- **MCP SDK** `@modelcontextprotocol/sdk ^1.26.0`
- **MCP 엔드포인트**: `POST /api/mcp`
- 외부 인증 불필요 (db.kasb.or.kr가 공개 API)

---

## 로컬 개발

```bash
npm install
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### MCP 테스트

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

---

## Vercel 배포

1. GitHub 저장소를 Vercel에서 Import (환경변수 불필요 — 공개 API라 인증 없음)
2. 배포 완료 후 MCP URL: `https://<your-app>.vercel.app/api/mcp`

`vercel.json`에 `regions: ["icn1"]`(서울), `fluid: true`가 설정되어 있어 국내 API 호출 지연이 최소화됩니다.

---

## 클라이언트 연결

### Claude for Excel / Claude Desktop
`사용자 지정` → `커넥터` → `커스텀 커넥터 추가`에서 MCP URL 등록.

### Claude Code
```bash
claude mcp add kasb-standard --transport http https://<your-app>.vercel.app/api/mcp
```

---

## 사용 예시

- "리스부채 최초 측정 관련 기준서 조항 찾아줘" → `search_standard(query="리스부채 최초 측정")`
- "기업회계기준서 1116호 목차 보여줘" → `get_standard_toc(std_num=1116)`
- "전환사채 발행 관련 질의회신 있어?" → `search_qna(query="전환사채 발행")`

---

## 주의

비공식 API이므로 db.kasb.or.kr 사이트 개편 시 조회가 실패할 수 있습니다. 실패 시 학습된 지식으로 추측하지 말고 "원문을 확인하지 못했다"고 답해야 합니다.
