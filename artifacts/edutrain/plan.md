# EduTrain 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 실행 모델 | 클라이언트 화면 전환(홈/자료·세트/풀이/결과) + 로컬 저장. 서버 DB 없음 | "나 혼자 MVP", 전부 로컬(spec INV-2). wireframe의 화면 전환 구조와 일치 |
| Gemini 호출 위치 | Route Handler(`app/api/generate`, `app/api/grade`)에서만. 클라이언트는 fetch | 키가 클라이언트 번들·네트워크에 노출되면 안 됨(INV-1). Route Handler는 서버 전용 |
| 엔진/UI 분리 | 문제 생성·서술형 채점 "엔진"을 UI와 별도 Task로 앞에 배치 | 두 LLM 통합이 **가장 위험한 가정**(idea.md). HTTP 경계에서 독립 검증하고 조기에 실패를 드러내기 위함 |
| 구조화 출력 | Gemini `responseMimeType: 'application/json'` + `responseSchema`로 문항/채점 JSON 강제 | 파싱 신뢰성. 자유 텍스트 파싱보다 견고 |
| 모델 | 생성·채점 모두 `gemini-2.5-flash` 기본 (모델 문자열 1곳에서 교체 가능) | 무료 티어. 서술형 채점 품질이 흔들리면 상위 모델로 승급(spec 미결정) |
| 채점 분리 | 객관식·단답 = 클라이언트 결정적 채점(lib), 서술형 = 서버 Gemini | 결정적 채점은 LLM 불필요·즉시·무료. 리스크를 서술형에 격리 |
| 상태 관리 | React state + localStorage 동기화 훅. 외부 상태 라이브러리 없음 | 규모가 작고 로컬 전용 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| `GEMINI_API_KEY` | Env var | `.env.local` (서버 전용, `.gitignore`됨) | 완료 (기존) |
| `radio-group` shadcn 컴포넌트 | UI dep | `components/ui/` | Task 5 (shadcn CLI) |
| `progress` shadcn 컴포넌트 | UI dep | `components/ui/` | Task 6 (shadcn CLI) |

## 데이터 모델

로컬 저장(localStorage). 모든 엔티티는 `types/quiz.ts`에 정의.

### Material (학습자료)
- id (required), title, content, createdAt

### Question (문항)
- id (required), type: 'mc' | 'short' | 'essay'
- prompt (required), tags: string[] (≥1), difficulty
- choices?: string[] (mc), answer?: string (mc/short), explanation
- rubric?: string (essay — 생성 시 함께 산출)

### QuizSet (세트)
- id (required), materialId → Material, questions: Question[], createdAt

### AnswerResult (문항별 채점 결과)
- questionId → Question, given, correct: boolean, score (0~100), feedback?

### SessionRecord (완료 세션)
- id (required), materialId → Material, score, total, weakTags: string[], completedAt

### Stats (진척)
- cumulativeScore, streakDays, lastStudyDate, bestCorrectStreak

### WeaknessEntry (약점 태그)
- tag (required), wrongCount, mastered: boolean

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | T1, T2, T5~T9 | Route Handler(`route.ts`), RSC 경계(`'use client'`), async API |
| shadcn | T5~T9 | UI 컴포넌트 추가·조합. `components/ui/*` 직접 수정 금지(가드) |
| vercel-react-best-practices | T5~T9 | 클라이언트 컴포넌트 성능 패턴 |
| web-design-guidelines | 최종 체크포인트 | 접근성·UX 리뷰 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/quiz.ts` | New | T1 (전체 엔티티 타입 정의) |
| `lib/prompts.ts` | New | T1, T2 |
| `services/gemini.ts` | New | T1, T2 |
| `app/api/generate/route.ts` | New | T1 |
| `app/api/grade/route.ts` | New | T2 |
| `lib/grading.ts` | New | T3 |
| `lib/scoring.ts` | New | T3 |
| `lib/storage.ts` | New | T4 |
| `lib/stats.ts` | New | T4 |
| `lib/weakness.ts` | New | T4 |
| `hooks/use-edutrain.ts` | New | T4, T5 |
| `components/edutrain/*` | New | T5~T9 |
| `app/page.tsx` | Modify | T5(셸·전환 골격), T6·T7·T8·T9(각 화면 전환 연결) |
| `hooks/use-edutrain.ts` | Modify | T6·T7(채점 결과 기록), T8(세션 완료·약점 세트), T9(자료 선택) |
| `components/ui/radio-group.tsx` | New (shadcn) | T5 |
| `components/ui/progress.tsx` | New (shadcn) | T6 |

## Tasks

### Task 1: 문제 생성 엔진 (Gemini) — 고위험 ✅

- **담당 판정 기준**: S1-5, S6-1, INV-1
- **크기**: M
- **의존성**: None
- **참조**:
  - next-best-practices (route handler, `route.ts`, Node runtime, server-only)
  - `@google/genai` (responseSchema, responseMimeType — README: SDK 사용법)
  - `artifacts/edutrain/spec.md` (S1-5, S6-1, INV-1)
- **구현 대상**:
  - `types/quiz.ts` (**전체 엔티티 타입 정의**: Material, Question, QuizSet, AnswerResult, SessionRecord, Stats, WeaknessEntry — 이후 Task는 이 파일을 소비하며 추가 시에만 Modify)
  - `lib/prompts.ts` (생성 프롬프트 + responseSchema; weakTags 우선 지시 포함)
  - `services/gemini.ts` (`generateQuestions(material, types, difficulty, count, weakTags?)`)
  - `app/api/generate/route.ts`
  - 테스트: `services/gemini.test.ts`, `app/api/generate/route.test.ts`
- **검증**: Vitest, `@google/genai` 모듈 mock. 테스트 이름에 `[S1-5]`,`[S6-1]`,`[INV-1]` 인용.
  - mocked 응답 → 파싱된 각 Question이 `tags.length>=1`, 요청 유형/개수 반영 `[S1-5]`
  - weakTags 전달 → 프롬프트/요청에 약점 태그 우선 지시가 포함되고 결과 태그 분포가 약점으로 치우침 `[S6-1]`
  - route 응답에 API 키 문자열이 포함되지 않고, 키는 서버 env에서만 읽힘(클라이언트 import 경로에 없음) `[INV-1]`
  - `bun run typecheck`

### Task 2: 서술형 채점 엔진 (Gemini) — 고위험 ✅

- **담당 판정 기준**: S3-1
- **크기**: S
- **의존성**: Task 1 (`types/quiz.ts`, `lib/prompts.ts` 공유)
- **참조**:
  - next-best-practices (route handler)
  - `@google/genai` (responseSchema)
  - `artifacts/edutrain/spec.md` (S3-1)
- **구현 대상**:
  - `lib/prompts.ts` (채점 프롬프트 + rubric 기반 점수·피드백 schema) — Modify
  - `services/gemini.ts` (`gradeEssay(question, answer)`) — Modify
  - `app/api/grade/route.ts`
  - 테스트: `app/api/grade/route.test.ts`
- **검증**: Vitest, Gemini mock. `[S3-1]` 인용.
  - 답안 입력 → `{ score: 0~100, feedback: string }` 형태로 반환 `[S3-1]`
  - `bun run typecheck`

### Task 3: 결정적 채점 + 점수 로직 ✅

- **담당 판정 기준**: S2-3
- **크기**: S
- **의존성**: Task 1 (types)
- **참조**:
  - `artifacts/edutrain/spec.md` (S2-3)
- **구현 대상**:
  - `lib/grading.ts` (`gradeObjective`: 객관식 정답 비교, 단답 정규화 비교)
  - `lib/scoring.ts` (세트 점수·백분율 계산)
  - 테스트: `lib/grading.test.ts`, `lib/scoring.test.ts`
- **검증**: Vitest 순수 단위. `[S2-3]` 인용.
  - 단답 정답을 대소문자·앞뒤 공백 차이로 입력 → 정답 처리 `[S2-3]`

### Task 4: 로컬 영속성 + 통계·스트릭·약점 ✅ (hooks/use-edutrain.ts는 T5로 이연)

- **담당 판정 기준**: S5-5, S6-2, INV-2, INV-3
- **크기**: M
- **의존성**: Task 1 (types)
- **참조**:
  - `artifacts/edutrain/spec.md` (S5-5, S6-2, INV-2, INV-3)
- **구현 대상**:
  - `lib/storage.ts` (Material/SessionRecord/Stats/Weakness localStorage 읽기·쓰기)
  - `lib/stats.ts` (누적 점수·연속 학습일·최고 연속 정답 계산)
  - `lib/weakness.ts` (오답 태그 집계, 정답 시 mastered 처리)
  - `hooks/use-edutrain.ts` (localStorage ↔ state 동기화; T5에서 확장)
  - 테스트: `lib/storage.test.ts`, `lib/stats.test.ts`, `lib/weakness.test.ts`
- **검증**: Vitest(jsdom localStorage). `[S5-5]`,`[S6-2]`,`[INV-2]`,`[INV-3]` 인용.
  - 오늘 첫 세트 완료 → 연속 학습일 +1; 같은 날 재완료 → 불변 `[S5-5]`
  - 약점 태그 문항을 이후 맞힘 → 약점 목록에서 제외/완화 `[S6-2]`
  - 저장 후 재로드 → 누적 점수·스트릭·자료·이력 유지 `[INV-2]`
  - 표시용 계산값이 저장된 세션 기록과 일치 `[INV-3]`

---

### Checkpoint: Tasks 1~4 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh edutrain --tests`
- [ ] 엔진(생성·채점)이 HTTP 경계에서 동작하고, 로직 lib가 단위 테스트로 증명됨

---

### Task 5: 자료 입력 & 세트 생성 화면 ✅

- **담당 판정 기준**: S1-1, S1-2, S1-3, S1-4, S1-6
- **크기**: M
- **의존성**: Task 1 (`/api/generate`), Task 4 (자료 저장)
- **참조**:
  - shadcn (textarea, checkbox, radio-group, button, card; `components/ui` 직접수정 금지)
  - next-best-practices (`'use client'`, 클라이언트 fetch)
  - `artifacts/edutrain/wireframe.html` (`screen-create`, `screen-create-empty`, `screen-create-fail`)
- **구현 대상**:
  - `app/page.tsx` (클라이언트 셸 + 화면 전환) — Modify
  - `components/edutrain/create-set.tsx` (자료 textarea, `.txt/.md` 업로드, 유형 체크박스, 난이도, 문항 수)
  - `components/ui/radio-group.tsx` (shadcn add)
  - 테스트: `components/edutrain/create-set.test.tsx`
- **검증**: Vitest + Testing Library(fetch mock). `[S1-1]`,`[S1-2]`,`[S1-4]`,`[S1-6]` 인용, `[S1-3]`.
  - 텍스트+객관식+보통+5 → "세트 생성" → 첫 문항 표시 `[S1-1]`
  - `.txt` 업로드 → 내용이 입력 영역에 반영 `[S1-2]`
  - 빈 자료로 생성 → "학습자료를 입력하세요"(제안 기본값), 세트 미생성 `[S1-3]`
  - 객관식+서술형 선택 → 두 유형 문항 포함 `[S1-4]`
  - 생성 API 실패 → 에러 안내 + "다시 시도", 홈 상태 유지 `[S1-6]`

### Task 6: 객관식·단답 풀이 & 즉시 채점 화면 ✅

- **담당 판정 기준**: S2-1, S2-2, S2-4
- **크기**: M
- **의존성**: Task 3 (결정적 채점), Task 5 (세트 존재)
- **참조**:
  - shadcn (card, button, radio-group, progress, badge)
  - `artifacts/edutrain/wireframe.html` (`screen-quiz-mc`)
- **구현 대상**:
  - `components/edutrain/quiz-runner.tsx` (문항 진행·문항 유형 분기)
  - `components/edutrain/question-objective.tsx` (객관식·단답 입력 + 제출 + 채점 결과)
  - `components/ui/progress.tsx` (shadcn add)
  - `app/page.tsx` 풀이 화면 전환 연결 + `hooks/use-edutrain.ts` 문항 채점 결과 기록 액션 (Modify)
  - 테스트: `components/edutrain/question-objective.test.tsx`
- **검증**: Vitest + Testing Library. `[S2-1]`,`[S2-2]`,`[S2-4]` 인용.
  - 정답 선택·제출 → "정답"(제안) + 해설 + 다음 문항 수단 `[S2-1]`
  - 오답 선택·제출 → "오답"(제안) + 정답 보기 + 해설 `[S2-2]`
  - 제출 후 같은 문항 답 변경 불가 `[S2-4]`

### Task 7: 서술형 풀이 화면 (즉시 채점) ✅

- **담당 판정 기준**: S3-2, S3-3
- **크기**: M
- **의존성**: Task 2 (`/api/grade`), Task 6 (풀이 흐름)
- **참조**:
  - shadcn (textarea, card, button)
  - `artifacts/edutrain/wireframe.html` (`screen-quiz-essay`, `screen-essay-empty`, `screen-essay-fail`)
- **구현 대상**:
  - `components/edutrain/question-essay.tsx` (답안 입력 + 제출 + 로딩 + 점수·피드백 + 에러)
  - `hooks/use-edutrain.ts` 서술형 채점 결과 기록 액션 (Modify)
  - 테스트: `components/edutrain/question-essay.test.tsx`
- **검증**: Vitest + Testing Library(fetch mock). `[S3-2]`,`[S3-3]` 인용.
  - 빈 답안 제출 → "답안을 입력하세요"(제안), 채점 미호출 `[S3-2]`
  - 채점 실패 → 에러 + "다시 채점", 기존 결과·진행 유지 `[S3-3]`
  - (S3-1의 점수·피드백 렌더는 T2 엔진 응답을 mock해 함께 표시 확인)

---

### Checkpoint: Tasks 5~7 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh edutrain --tests`
- [ ] 자료 입력 → 세트 생성 → 객관식·단답·서술형 풀이·즉시 채점이 end-to-end로 동작

---

### Task 8: 세트 결과 & 약점 & 추천 화면

- **담당 판정 기준**: S4-1, S4-2, S4-3, S4-4
- **크기**: M
- **의존성**: Task 4 (약점·점수), Task 7 (세트 완료)
- **참조**:
  - shadcn (card, badge, button)
  - `artifacts/edutrain/wireframe.html` (`screen-result`, `screen-weak-set`)
- **구현 대상**:
  - `components/edutrain/result-view.tsx` (점수, 약점 주제 태그, 텍스트 추천, "약점만 다시 풀기")
  - `components/edutrain/weak-set-preview.tsx` (wireframe `screen-weak-set`: 약점 주제 목록 + 출제 예정 문항 미리보기 + "시작"). "약점만 다시 풀기" → 이 미리보기 → "시작" 시 `/api/generate`를 약점 태그로 호출해 세트 생성
  - `app/page.tsx` 결과·약점세트 화면 전환 연결 (Modify)
  - 테스트: `components/edutrain/result-view.test.tsx`, `components/edutrain/weak-set-preview.test.tsx`
- **검증**: Vitest + Testing Library. `[S4-1]`~`[S4-4]` 인용.
  - 세트 점수(정답/전체 또는 %) 표시 `[S4-1]`
  - 틀린 문항의 주제 태그가 "약점 주제"로 표시 `[S4-2]`
  - 점수 ≥ 임계값(제안 80%) → 텍스트 추천 표시 `[S4-3]`
  - "약점만 다시 풀기" → 미리보기 경유 → 약점 태그 위주 새 세트 생성 `[S4-4]`

### Task 9: 홈 & 진척(점수·스트릭·이력) & 저장 자료

- **담당 판정 기준**: S5-1, S5-2, S5-3, S5-4
- **크기**: M
- **의존성**: Task 4 (통계·저장), Task 8 (세션 기록 존재)
- **참조**:
  - shadcn (card, button)
  - vercel-react-best-practices (리스트 렌더)
  - `artifacts/edutrain/wireframe.html` (`screen-home`)
- **구현 대상**:
  - `components/edutrain/home.tsx` (누적 점수, 스트릭 둘 다, 지난 세션 추이, 저장 자료 목록·선택)
  - `app/page.tsx` 홈 화면 연결 + `hooks/use-edutrain.ts` 자료 선택 → 세트 생성 진입 액션 (Modify)
  - 테스트: `components/edutrain/home.test.tsx`
- **검증**: Vitest + Testing Library(로컬 저장 시드). `[S5-1]`~`[S5-4]` 인용.
  - 누적 점수 표시 `[S5-1]`
  - 스트릭(연속 학습일 + 최고 연속 정답) 둘 다 표시 `[S5-2]`
  - 지난 세션 점수 목록 표시 `[S5-3]`
  - 저장 자료 선택 → 그 자료로 새 세트 생성 `[S5-4]`

---

### 최종 Checkpoint
- [ ] 모든 테스트 통과 / 빌드 성공 / `scripts/spec-coverage.sh edutrain --tests`
- [ ] 실제 Gemini 키로 생성·서술형 채점을 1회 수동 확인(리스크 spike): 문항 품질·태그·채점 신뢰성 육안 평가, 증거 `artifacts/edutrain/evidence/`에 저장 (web-design-guidelines로 UI 접근성도 점검)
- [ ] spec.md의 **End-to-end 검증** 절차를 실행하고, 통과한 판정 기준 체크박스를 spec.md에서 켠다 (INV-1: 네트워크 탭/번들에 키 미노출, INV-2: 새로고침 후 유지, INV-3: 표시값=기록 일치 포함)

## 미결정 항목

- 서술형 rubric을 생성 시 문항마다 자동 산출(현재 계획)할지, 자료 기반 고정 rubric으로 뽑을지 — 최종 spike의 채점 신뢰성 결과로 확정 (spec 미결정 승계).
- 서술형 점수 표현(0~100% vs 상/중/하)·추천 임계값(80%)은 제안 기본값. 사용 후 조정.
