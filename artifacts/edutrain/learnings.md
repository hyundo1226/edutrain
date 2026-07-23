# edutrain learnings

---
triggers: [vitest, "is not a constructor", "@google/genai", GoogleGenAI, vi.mock, mock class]
status: verified
scope: this-repo (vitest 4.x, @google/genai 2.x)
date: 2026-07-23
---
## `new`으로 호출되는 클래스를 vi.mock할 때 화살표 함수를 쓰면 "is not a constructor"

**지시문**: `new GoogleGenAI(...)`처럼 생성자로 호출되는 export를 vi.mock할 때는 `vi.fn(() => ({...}))` 대신 `class { ... }`로 mock하라. vi.fn에 화살표 함수 구현을 넣으면 `new`에서 "() => ... is not a constructor"로 실패한다.
**에피소드**: Task 1에서 services/gemini.test.ts가 `GoogleGenAI: vi.fn(() => ({ models: {...} }))`로 mock했다가 3개 테스트가 전부 TypeError. `class { models = { generateContent: mock } }`로 바꾸니 통과.
**증거**: commit 580fced, services/gemini.test.ts [S1-5][S6-1][INV-1] 통과

---
triggers: [next/server, NextResponse, route.ts, vitest, "POST", route handler test]
status: verified
scope: this-repo (next 16, vitest 4 jsdom)
date: 2026-07-23
---
## Route Handler는 next/server import 없이 표준 Request로 직접 테스트된다

**지시문**: route.ts의 POST/GET을 테스트할 때 표준 `new Request(url, { method, body })`를 만들어 `POST(req)`에 직접 넘기고, 응답은 `await res.json()` / `await res.text()`로 읽어라. next 테스트 서버를 띄울 필요 없다. NextResponse.json은 jsdom에서 그대로 동작한다.
**에피소드**: Task 1·2에서 /api/generate·/api/grade 라우트를 이 방식으로 테스트. 서비스 계층은 `vi.mock("@/services/gemini")`로 격리.
**증거**: commit 580fced/b08ed8f, app/api/*/route.test.ts 통과

---
triggers: [INV-1, API 키 노출, 에러 메시지, route handler, catch, console.error]
status: verified
scope: this-repo
date: 2026-07-23
---
## 클라이언트로 나가는 에러 응답에 원본 에러 메시지를 넣지 않는다 (키 유출 방지)

**지시문**: Gemini 등 외부 API를 호출하는 route에서 catch 시 `error.message`를 응답 본문에 넣지 마라. 서버는 `console.error(error)`로만 남기고 클라이언트에는 일반 메시지("문제 생성에 실패했습니다")만 반환하라. 인증 에러 메시지에 키가 섞여 나올 수 있다(INV-1).
**에피소드**: Task 1·2에서 "에러 메시지에 키가 섞여도 응답에는 새지 않는다" 테스트로 이 경계를 고정.
**증거**: commit 580fced, route.test.ts [INV-1] 통과

---
triggers: [플랜 이연, hooks/use-edutrain.ts, Task 4, Task 5, 스켈레톤]
status: verified
scope: this-repo (edutrain plan)
date: 2026-07-23
---
## 테스트되지 않는 훅 스켈레톤을 미리 만들지 말고 첫 소비 시점으로 이연한다

**지시문**: plan이 상태 훅(use-edutrain.ts)을 데이터 레이어 Task와 UI Task 양쪽에 배치했다면, 훅은 UI가 처음 소비하는 Task에서 만들어라. 데이터 레이어 Task의 판정 기준이 순수 lib 테스트로 전부 증명되면 훅은 배선일 뿐이고, 미리 만든 스켈레톤은 UI에서 재작성된다.
**에피소드**: Task 4가 hooks/use-edutrain.ts를 구현 대상에 포함했으나, S5-5·S6-2·INV-2·INV-3가 lib/stats·weakness·storage 순수 테스트로 전부 증명되어 훅을 Task 5로 이연.
**증거**: commit fc31b44 계열, lib/{stats,weakness,storage}.test.ts 통과. 훅 부재로 놓친 커버리지 없음.
