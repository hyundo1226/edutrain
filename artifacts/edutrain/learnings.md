# edutrain learnings

---
triggers: [getByRole, accessible name, radio, 라벨 텍스트 변경, locked, 채점 결과 표시]
status: verified
scope: this-repo (testing-library + radix RadioGroupItem)
date: 2026-07-23
---
## 채점 후 라디오 라벨에 "✓ 정답" 같은 상태 텍스트를 덧붙이면 접근 가능한 이름이 바뀌어 getByRole 매칭이 깨진다

**지시문**: `<label><RadioGroupItem/><span>{선택지}</span>{조건부 상태 텍스트}</label>` 패턴에서, 상태 텍스트가 라벨 안에 있으면 그 라디오의 accessible name에 병합된다. 채점 전/후 모두를 매칭해야 하는 테스트는 `getByRole("radio", { name: "정확한 문자열" })` 대신 `{ name: /^접두어/ }` 정규식을 써라.
**에피소드**: Task 6 question-objective.test.tsx의 S2-4 테스트에서 채점 후 `getByRole("radio", { name: "list" })`가 실패 — 실제 접근 이름이 "list ✓ 정답"으로 바뀌어 있었다.
**증거**: components/edutrain/question-objective.test.tsx [S2-4], `{ name: /^list/ }`로 수정 후 3/3 통과

---
triggers: [use-edutrain, quiz-runner, 결과 상태 소유, 중복 state, recordResult]
status: verified
scope: this-repo (edutrain plan)
date: 2026-07-23
---
## 세션 전체에 걸친 결과 배열은 화면 컴포넌트가 아니라 공유 hook이 소유해야 한다

**지시문**: 여러 문항에 걸쳐 누적되는 상태(채점 결과 목록)는 quiz-runner 같은 화면 컴포넌트의 로컬 state로 두지 말고 hooks/use-edutrain.ts로 올려라. 화면 컴포넌트는 문항 단위 콜백(`onGraded`)만 상위로 전달하고, 완료 시점(`onComplete`)도 인자 없이 호출해 hook이 이미 들고 있는 결과를 그대로 쓰게 한다. 그래야 T8(결과 화면)이 같은 hook 인스턴스에서 결과를 그대로 읽을 수 있다.
**에피소드**: Task 6에서 처음엔 quiz-runner.tsx가 `results` state를 자체로 들고 완료 시 배열을 넘기도록 설계했다가, hook으로 옮겨 `recordResult` 액션으로 통일. app/page.tsx가 결과 화면에서 `results`를 그대로 재사용할 수 있게 됨.
**증거**: hooks/use-edutrain.ts (results/recordResult), app/page.tsx의 result 플레이스홀더가 `scoreSet(results)`로 정상 집계 (브라우저 수동 확인: 200/200 100% — 2/2 정답)

---
triggers: [서술형 correct, essay threshold, AnswerResult correct, S4-3, 80%, 약점 판단 임계값]
status: hypothesis
scope: this-repo (edutrain plan, 제안 기본값 영역)
date: 2026-07-23
---
## 서술형 AnswerResult.correct는 S4-3 추천 임계값(80%)을 재사용해 판단했다 — spec 미결정 영역의 임의 선택

**지시문**: 서술형 채점은 원래 이분법적 정오 개념이 없다(부분점수만 있음). AnswerResult.correct(boolean)를 약점 태그·정답수 집계에 써야 해서 `score >= 80`을 기준으로 correct를 정했다. spec의 "S3-1의 점수 표현·S4-3 임계값은 제안 기본값" 미결정 항목과 직결되므로, 사용자가 실제 사용 후 임계값을 조정하면 `lib/grading` 또는 `question-essay.tsx`의 `ESSAY_CORRECT_THRESHOLD` 상수만 바꾸면 된다.
**에피소드**: Task 7에서 question-essay.tsx 구현 중 결정. 브라우저 확인에서 72점 답안이 "0/1 정답"으로 집계됨(72 < 80) — 의도된 동작.
**증거**: components/edutrain/question-essay.tsx의 `ESSAY_CORRECT_THRESHOLD = 80`. 실사용 피드백 전까지는 hypothesis로 유지.

---
triggers: [browser 자동화, clipboard, type action, 붙여넣기, 텍스트영역 오염, 테스트 아티팩트]
status: hypothesis
scope: this-session (Claude Browser pane 자동화)
date: 2026-07-23
---
## 브라우저 자동화의 `type` 액션이 시스템 클립보드 내용을 텍스트 필드에 흘려보낸 것으로 보이는 사례 관찰

**지시문**: 브라우저 pane에서 한글 등 비-ASCII 텍스트를 `type`으로 입력했는데 필드에 예상치 못한 대량의 이전 클립보드 텍스트가 나타나면, 코드 버그로 오인하지 말고 `ctrl+a` → `Delete`로 필드를 비운 뒤 재입력해 우회하라. 실제 컴포넌트 로직(제출·채점·결과 반영)은 정상이었다.
**에피소드**: Task 7 브라우저 검증 중 학습자료 textarea에 CLAUDE.md 관련 긴 텍스트가 삽입됨. 원인은 자동화 도구의 타이핑 방식으로 추정, 컴포넌트 코드와 무관.
**증거**: 우회 후 서술형 채점~결과 화면까지 정상 동작 확인(72/100, 0/1 정답). 재발 시 이 항목을 verified로 승격.

---
triggers: [computer type, 한글 입력, textarea 값 설정, javascript_tool, dispatchEvent input, 브라우저 자동화 신뢰성]
status: verified
scope: this-session (Claude Browser pane)
date: 2026-07-23
---
## 브라우저 자동화로 폼 필드에 한글 텍스트를 넣을 땐 computer.type보다 javascript_tool로 값을 직접 세팅하는 편이 안전하다

**지시문**: 검증 중 textarea/input에 한글 등 비-ASCII 텍스트를 넣어야 하면, `computer{action:"type"}` 대신 `javascript_tool`로 네이티브 value setter를 호출하고 `input` 이벤트를 dispatch하라: `Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(el, text); el.dispatchEvent(new Event('input',{bubbles:true}))`. React controlled input과도 호환되고 클립보드 오염 문제를 피한다.
**에피소드**: Task 7에서 computer.type이 클립보드 아티팩트를 유발한 뒤, Task 8 검증에서는 이 방식으로 전환해 문제없이 재현.
**증거**: Task 8 브라우저 검증 전체(자료 입력~약점 재출제)가 이 방식으로 한 번에 성공.

---
triggers: [completeSet, session record, weakTags, storage.addSession, recordSessionStats, updateWeaknesses, hook 통합]
status: verified
scope: this-repo (edutrain plan)
date: 2026-07-23
---
## 퀴즈 완료 → 세션·통계·약점 영속화는 hook의 단일 액션(completeSet)에서 한 번에 처리해야 한다

**지시문**: Task 4에서 만든 storage/stats/weakness lib들은 그 자체로는 아무것도 호출하지 않는다. QuizRunner의 onComplete가 단순히 화면 전환만 하면 세션이 저장되지 않는다. hooks/use-edutrain.ts에 `completeSet` 액션을 추가해 (1) updateWeaknesses로 약점 갱신 (2) scoreSet으로 점수 계산 (3) recordSessionStats로 통계 갱신 (4) storage.addSession/saveStats/saveWeaknesses로 영속화를 한 번에 수행하고, 그 결과로 "result" 화면으로 전환하게 했다.
**에피소드**: Task 8에서 age.tsx의 quiz→result 전환이 `() => goTo("result")` 플레이스홀더였던 것을 `completeSet`으로 교체. 브라우저에서 localStorage 확인: sessions/stats/weaknesses 모두 정확히 기록됨(streakDays 1, weakTags ["자료형"] 등).
**증거**: hooks/use-edutrain.ts의 completeSet, 브라우저 localStorage 덤프로 실증(세션 1건, stats.streakDays=1, weaknesses에 자료형 wrongCount:1)

---
triggers: [updateWeaknesses, mastered true wrongCount 0, 정답 태그 신규 엔트리, weakness 목록 성장]
status: hypothesis
scope: this-repo (lib/weakness.ts)
date: 2026-07-23
---
## updateWeaknesses는 이전에 약점이 아니었던 태그를 정답 처리해도 {wrongCount:0, mastered:true} 엔트리를 새로 만든다

**지시문**: 이는 activeWeakTags(mastered 아니고 wrongCount>0 필터)에는 영향 없어 현재 기준 충족에는 문제없지만, 세션이 누적되면 weaknesses 배열이 "한 번이라도 맞은 모든 태그"까지 담아 계속 커진다. 저장 용량·표시 성능이 문제되면 `updateWeaknesses`에서 correct인데 기존 엔트리가 없으면 아예 새로 만들지 않도록 바꿔라.
**에피소드**: Task 8 브라우저 검증에서 "가변성"(정답, 이전 약점 아님)이 `{wrongCount:0, mastered:true}`로 저장됨을 확인.
**증거**: 브라우저 localStorage 덤프. 아직 실사용 규모에서 문제 재현 안 됨 — hypothesis로 유지.
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

---
triggers: [create-set, fetch mock, hooks/use-edutrain, 화면 컴포넌트, 자료 저장, addMaterial]
status: verified
scope: this-repo (edutrain plan)
date: 2026-07-23
---
## 화면 컴포넌트가 자기 완결적으로 fetch+storage를 호출하면 "fetch mock" 테스트가 자연스럽다

**지시문**: plan의 컴포넌트 검증란이 "Testing Library(fetch mock)"라고 명시하면, 그 컴포넌트는 자체적으로 `fetch`와 `lib/storage`의 순수 함수를 직접 호출하게 설계하라. 상태를 상위 hook에 위임하면 테스트가 hook을 모킹해야 해서 명시된 "fetch mock" 방식과 어긋난다. hooks/use-edutrain.ts는 화면 간 공유 상태(현재 화면, 진행 중인 자료·세트)만 얇게 들고, 화면별 네트워크·영속성 호출은 각 컴포넌트가 직접 한다.
**에피소드**: Task 5의 create-set.tsx를 이 방식으로 설계 — 컴포넌트가 직접 `fetch('/api/generate')`와 `lib/storage.addMaterial`을 호출하고, 완료 시 `onGenerated(material, quizSet)`만 부모에 알린다. 테스트는 `vi.stubGlobal('fetch', ...)`로 5개 케이스 모두 통과.
**증거**: components/edutrain/create-set.test.tsx [S1-1][S1-2][S1-3][S1-4][S1-6] 5/5 통과

---
triggers: [Gemini, 429, RESOURCE_EXHAUSTED, prepayment credits, GEMINI_API_KEY, 실제 호출 실패, ai.studio billing]
status: verified
scope: this-project (2026-07-23 시점 프로젝트 Gemini 계정)
date: 2026-07-23
---
## 브라우저 실제 검증 중 Gemini 호출이 429(크레딧 소진)로 실패 — 코드 결함 아님

**지시문**: `/api/generate`·`/api/grade` 실제 호출이 실패하면 먼저 서버 로그(`preview_logs`)에서 원인을 확인하라. `RESOURCE_EXHAUSTED`/"prepayment credits are depleted"면 코드가 아니라 계정 결제 문제이므로 재시도·디버깅 대신 사용자에게 AI Studio 결제 확인을 안내하고, 최종 spike(실제 문항 품질·채점 신뢰성 확인)는 크레딧 충전 후로 미룬다.
**에피소드**: Task 5 브라우저 검증 중 create-set.tsx에서 실제 자료로 세트 생성 시도 → "문제 생성에 실패했습니다" 표시. 서버 로그에서 429 RESOURCE_EXHAUSTED 확인. 동시에 이 실패가 S1-6 에러 처리(일반 메시지 노출, 키 미노출)와 다시 시도 버튼이 실제 오류에서도 올바르게 동작함을 재확인하는 계기가 됨.
**증거**: preview_logs, `[/api/generate] 생성 실패: Error [ApiError]: ...RESOURCE_EXHAUSTED...status 429`. 최종 Checkpoint의 "실제 Gemini 키로 1회 수동 확인" 항목은 크레딧 충전 필요.
