# edutrain learnings

---
triggers: [연속 학습일, streak, lastStudyDate, 스트릭 리셋, 하루 건너뛰기, code-review 발견]
status: verified
scope: this-repo (lib/stats.ts)
date: 2026-07-23
---
## "연속 학습일" 로직은 "오늘인가 아닌가"만으로는 부족하다 — 하루 공백 리셋을 명시적으로 계산해야 한다

**지시문**: streak(연속 일수) 필드를 다룰 때 `lastDate === today ? 불변 : +1` 패턴만 쓰면, 며칠을 건너뛰어도 계속 +1이 되는 버그가 생긴다. `오늘==마지막날짜 → 불변`, `마지막날짜의 바로 다음날 → +1`, `그 외(공백·최초) → 1로 리셋` 세 갈래로 분기하라.
**에피소드**: 독립 code-review 에이전트(Task 12)가 `recordSessionStats`에서 이 버그를 지적. 10일 공백 후 완료해도 streakDays가 계속 증가함을 재현 테스트로 확인 후 `isNextDay` 헬퍼 추가로 수정.
**증거**: commit 99e2a0f, lib/stats.test.ts "하루 이상 건너뛰고 완료하면 연속 학습일이 1로 리셋된다" 통과

---
triggers: [약점 태그 불일치, weakTagsFromResults, activeWeakTags, 세션 로컬 vs 전역, 약점만 다시 풀기, 빈 약점 세트]
status: verified
scope: this-repo (edutrain plan)
date: 2026-07-23
---
## 화면 전환의 "버튼 활성화 조건"과 "다음 화면이 실제로 쓰는 데이터"는 같은 소스여야 한다

**지시문**: A 화면의 버튼이 B 화면으로 이동하면서 데이터도 함께 규정한다면(여기선 "약점만 다시 풀기" → 약점 태그로 재출제), 버튼의 disabled 조건과 B 화면이 실제로 쓰는 데이터는 반드시 같은 상태 소스에서 파생시켜라. 서로 다른 스코프(세션-로컬 vs 전역-누적)의 값을 각각 쓰면, 버튼은 켜져 있는데 다음 화면엔 아무것도 없는 불일치가 생긴다.
**에피소드**: ResultView의 "약점만 다시 풀기" 버튼은 `weakTagsFromResults`(이번 세션 오답)로 활성화 여부를 정했지만, 실제 WeakSetPreview는 `activeWeakTags`(전역 누적, completeSet 이후 mastered 반영)를 쓴다. 같은 세트 안에서 같은 태그를 틀렸다 맞히면 세션-로컬 상 "약점 있음"이지만 전역상 "이미 극복"이라 버튼과 다음 화면이 어긋난다. 독립 code-review 에이전트가 지적. `hasActiveWeakTags` prop을 추가해 page.tsx가 hook의 `activeWeakTags`를 버튼에도 그대로 넘기도록 수정.
**증거**: commit 99e2a0f, result-view.test.tsx의 hasActiveWeakTags=false 테스트, 브라우저 실증(같은 태그 문항 오답→정답 세트 완료 후 결과 화면에서 disabled:true, weaknesses에 mastered:true 확인)

---
triggers: [독립 리뷰 프로세스, code-review 스킬 미등록, security-review, 서브에이전트 위임]
status: verified
scope: this-session (harness 설정)
date: 2026-07-23
---
## 이 세션엔 `/code-review` 스킬이 등록돼 있지 않다 — general-purpose 에이전트로 대체한다

**지시문**: execute-plan Step 4가 "/code-review 스킬 실행"을 지시하지만, Skill 목록에 없으면(`disable-model-invocation` 에러) general-purpose 에이전트에게 "diff 범위 + 파일 목록 + 체크리스트"를 직접 프롬프트로 구성해 위임하라. `/security-review`는 이 세션에서 정상 동작했다.
**에피소드**: Task 12에서 `Skill({skill:"code-review"})` 호출이 `Skill code-review cannot be used with Skill tool due to disable-model-invocation` 에러로 실패. general-purpose 에이전트에 6cf1629..HEAD diff 리뷰를 위임해 동등한 결과를 얻음(스트릭 버그·약점 불일치·중복·테스트 공백 4건 발견, 전부 반영).
**증거**: 이 세션의 도구 목록(review/security-review만 노출, code-review 없음), Task 12 에이전트 리뷰 결과

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

---
triggers: [hydration, "Hydration failed", useState 초기화, localStorage useState, SSR CSR mismatch, Next.js dev overlay, "1 Issue"]
status: verified
scope: this-repo (Next.js 16 App Router, 클라이언트 컴포넌트가 localStorage를 읽는 훅)
date: 2026-07-23
---
## localStorage를 읽는 값을 useState 초기화 함수에 직접 넣으면 hydration mismatch가 난다

**지시문**: `useState(() => storage.loadX())`처럼 브라우저 전용 API(localStorage)를 useState 초기화 함수에서 직접 호출하지 마라. SSR에서는 `window===undefined`라 fallback(빈 값)을 반환하지만, 클라이언트 첫 렌더에서는 실제 값을 반환해 서버 렌더 결과와 달라져 React가 "Hydration failed" 오류를 낸다. 대신 `useState(EMPTY_VALUE)`로 SSR과 동일한 초기값을 주고, `useEffect(() => { setX(storage.loadX()) }, [])`로 마운트 후에 채워라.
**에피소드**: Task 9에서 hooks/use-edutrain.ts의 stats/weaknesses/sessions/materials를 `useState(() => storage.loadX())`로 초기화했다가, 브라우저 검증 중 Next.js dev overlay가 "Hydration failed... <div>100</div> vs <div>0</div>" 에러를 표시. useEffect로 옮겨 해결.
**증거**: hooks/use-edutrain.ts, 브라우저 재확인(에러 배지 사라짐, 콘솔 에러 0). 컴포넌트 단위 테스트(Testing Library, jsdom)는 SSR을 흉내내지 않아 이 버그를 잡지 못했다 — localStorage를 초기 렌더에서 읽는 훅은 반드시 실제 브라우저(Next dev 서버)로 검증해야 한다.
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
**증거**: preview_logs, `[/api/generate] 생성 실패: Error [ApiError]: ...RESOURCE_EXHAUSTED...status 429`.
**후속(해결됨, 2026-07-23 같은 날)**: 같은 계정 내 여러 키를 시도해도 동일 에러 반복 → 순수 curl(SDK 우회)로도 동일 에러 → 계정의 Gemini API 전용 선불(prepay) 크레딧 소진이 원인임을 확정(일반 GCP 무료체험 크레딧과는 별개). 이후 사용자가 같은 계정에서 새로 발급한 키로 전환하니 정상 동작(아래 항목 참고). 최종 Checkpoint의 "실제 Gemini 키로 1회 수동 확인"·S1-5·S6-1·INV-1 전부 실제 호출로 검증 완료.

---
triggers: [Gemini API 키 형식, AIzaSy, "AQ.Ab8", API 키 검증, 429 진단, curl 우회 테스트, 키 인증 성공 판별]
status: verified
scope: this-project (2026-07-23 시점, gemini-flash-latest 응답 modelVersion gemini-3.6-flash)
date: 2026-07-23
---
## Gemini API 키가 `AIzaSy...`로 시작해야 한다는 가정은 이제 최신이 아니다 — `AQ.Ab8...` 형식도 유효한 키다

**지시문**: Gemini API 키 형식을 안다고 가정하지 말고, 형식이 낯설면 "형식이 다르다"고 바로 무효 판정하지 말고 실제로 최소 비용(`curl`로 짧은 프롬프트 1회)으로 검증하라. AI Studio의 "API 키 세부정보" 다이얼로그(이름: "Gemini API Key")에서 나온 값이면 형식과 무관하게 우선 신뢰할 근거가 있다.
**에피소드**: 사용자가 두 번 `AQ.Ab8...` 형식 값을 제시했을 때 "AIzaSy 형식이 아니다"라며 두 번 다 거부했으나, 세 번째로 "API 키 세부정보" 다이얼로그 스크린샷과 함께 온 같은 형식의 값은 실제로 유효했다(정상 응답, modelVersion `gemini-3.6-flash`). 오래된 지식(AIzaSy 접두사)에 과신해 실제 검증을 미룬 것이 판단 지연의 원인.
**증거**: `curl .../gemini-flash-latest:generateContent` 성공 응답(candidates 반환), 이후 실제 앱에서 S1-5/S6-1/S3-1/INV-1 전부 실증

---
triggers: [INV-1 실증, 네트워크 탭 확인, 클라이언트 번들 스캔, read_network_requests, 키 노출 검사 방법]
status: verified
scope: this-repo (Next.js 16, Claude Browser pane)
date: 2026-07-23
---
## "네트워크 응답·클라이언트 번들에 키 미노출"은 스크립트 태그 전수 스캔으로 기계적으로 검증할 수 있다

**지시문**: INV-1류("키가 번들에 없다") 기준을 검증할 때는 `read_network_requests`로 실제 응답 바디를 읽고, 추가로 브라우저에서 `document.querySelectorAll('script[src]')`로 모든 스크립트를 fetch해 키 문자열 포함 여부를 전수 검사하라. 육안으로 코드를 읽는 것보다 빠르고 확실하다.
**에피소드**: Task 12 최종 검증에서 21개 클라이언트 스크립트를 전수 스캔해 키 문자열이 어디에도 없음을 확인. 응답 바디 확인과 합쳐 INV-1을 완전히 실증.
**증거**: javascript_tool 스캔 결과 `{"scriptCount":21,"found":[]}`
