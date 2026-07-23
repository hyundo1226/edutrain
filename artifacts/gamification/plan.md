# 게임화 (잔디·관심사 배지·레벨) 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 게임화 데이터 저장 방식 | 기존 `Stats`/`SessionRecord`와 완전히 독립된 새 저장소(`GamificationState`) 신설 | INV-1(이 기능 도입 이후만 반영)을 마이그레이션·과거 데이터 필터링 없이 설계로 보장. 새 store는 항상 빈 값에서 시작하므로 소급 문제가 원천적으로 없음 |
| 배지 판정 | "획득한 배지 목록"을 별도로 저장하지 않고, `tagCounts`에서 매번 순수 함수로 파생(`deriveBadges`) | 저장된 배지 목록과 실제 카운트가 어긋나는 drift를 원천 차단 (INV-2). edutrain 본편의 `updateWeaknesses`/`activeWeakTags` 분리 패턴과 동일한 원칙 |
| 레벨업·배지 알림 트리거 | `completeSet` 실행 전/후의 `GamificationState`를 비교해 "새로 획득한 배지"·"레벨업 여부"를 매 완료 시점에 계산, 훅 state로 노출 | 결과 화면은 완료 직후에만 마운트되므로 훅이 마지막 완료의 diff만 들고 있어도 충분. edutrain 본편의 `hasActiveWeakTags`처럼 "화면 전환 조건과 다음 화면 데이터는 같은 소스"를 유지 |
| 문항→태그 집계 위치 | `lib/weakness.ts`를 건드리지 않고 `lib/gamification.ts`를 새로 만들어 독립 집계 | 약점(오답 전용) 집계와 관심사(정답+오답 총량) 집계는 의미가 달라 같은 함수에 얹으면 두 관심사가 섞임 |
| 오늘 날짜 주입 | `lib/gamification.ts`의 함수들은 `today: string`/`Date`를 매개변수로 받고 내부에서 `new Date()`를 호출하지 않음 | `lib/stats.ts`의 기존 컨벤션과 동일 — 순수 함수 유지, 유닛 테스트에서 날짜를 고정해 결정론적으로 검증 |

## 인프라 리소스

None — 클라이언트 로컬 저장(localStorage)만 사용, 외부 리소스·API 없음.

## 데이터 모델

### GamificationState (신규, `types/quiz.ts`에 추가)
- levelScore (required) — 이 기능 도입 이후 누적 점수 (기존 `Stats.cumulativeScore`와 별개)
- tagCounts (required) — 태그 → 이 기능 도입 이후 그 태그가 달린 문항을 푼 총 횟수(정답/오답 무관)
- dailyActivity (required) — "YYYY-MM-DD" 날짜 → 그 날 푼 문항 수 합계

파생 값(저장하지 않음, 매번 계산): 배지 목록(`tagCounts`에서), 레벨·진행률(`levelScore`에서), 잔디 그리드(`dailyActivity`에서), 새로 획득한 배지·레벨업 여부(완료 전/후 diff)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| shadcn | T3, T4, T5, T6 | 기존 `Badge`/`Progress` 컴포넌트 재사용. `components/ui/*` 직접 수정 금지(가드) |
| next-best-practices | T1~T6 | 클라이언트 컴포넌트(`'use client'`), 훅 패턴 |
| vercel-react-best-practices | T3 | 365칸 그리드 렌더링 시 리스트 key·불필요 리렌더 방지 |
| web-design-guidelines | 최종 체크포인트 | 잔디 색 강도가 색상에만 의존하지 않도록(저시력·색맹 접근성) 각 칸에 `title`/텍스트 대체 정보 확인 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/quiz.ts` | Modify (GamificationState 추가) | T1 |
| `lib/gamification.ts` | New | T1 |
| `lib/storage.ts` | Modify (loadGamification/saveGamification 추가) | T1 |
| `hooks/use-edutrain.ts` | Modify (completeSet 확장, gamification·lastCompletionNotice 노출) | T2 |
| `components/edutrain/grass-calendar.tsx` | New | T3 |
| `components/edutrain/home.tsx` | Modify (T3가 `gamification` prop 신설+잔디 통합 → T4가 그 위에 배지 추가 → T5가 그 위에 레벨 추가, 순차 누적 수정) | T3, T4, T5 |
| `components/edutrain/badge-list.tsx` | New | T4 |
| `components/edutrain/level-card.tsx` | New | T5 |
| `components/edutrain/result-view.tsx` | Modify (배지·레벨업 알림 배너) | T6 |
| `app/page.tsx` | Modify (gamification·lastCompletionNotice 전달) | T3, T6 |

## Tasks

### Task 1: 게임화 계산 로직 + 저장 ✅

- **담당 판정 기준**: INV-1
- **크기**: M
- **의존성**: None
- **참조**:
  - `artifacts/gamification/spec.md`
  - `lib/stats.ts`, `lib/storage.ts` (기존 컨벤션: `today` 매개변수 주입, `KEYS`/`read`/`write` 패턴)
- **구현 대상**:
  - `types/quiz.ts`: `GamificationState` 인터페이스 추가 (Modify)
  - `lib/gamification.ts`: `EMPTY_GAMIFICATION`, `BADGE_THRESHOLD`(=10), `LEVEL_INTERVAL`(=500), `recordSessionGamification(prev, questions, results, today)`, `levelForScore`, `levelProgress`, `didLevelUp`, `deriveBadges`, `newlyEarnedBadges`, `intensityLevel`, `buildGrassGrid(dailyActivity, todayDate, days=365)`
  - `lib/storage.ts`: `loadGamification`/`saveGamification` 추가 (Modify, 기존 `KEYS` 객체에 `gamification: "edutrain:gamification"` 추가)
  - 테스트: `lib/gamification.test.ts`
- **검증**: Vitest 순수 단위.
  - `recordSessionGamification`이 기존 `Stats.cumulativeScore`나 `SessionRecord` 이력과 무관하게 `EMPTY_GAMIFICATION`에서 항상 0부터 누적을 시작한다 `[INV-1]`
  - 같은 `today`로 `recordSessionGamification`을 두 번 호출(같은 날 세트 2회 완료를 시뮬레이션)하면 `dailyActivity[today]`가 덮어써지지 않고 두 세트의 문항 수 합으로 누적되고, `tagCounts`도 두 호출의 태그 수가 합산된다 `[S2]` (독립 리뷰에서 지적된 커버리지 공백 — 자동 테스트 없이 최종 수동 확인에만 의존하던 부분)
  - `levelForScore(0)`=1, `levelForScore(499)`=1, `levelForScore(500)`=2
  - `didLevelUp(499, 500)`=true, `didLevelUp(400, 499)`=false
  - `deriveBadges`가 count>=10인 태그만 반환, `newlyEarnedBadges`가 이번에 막 10을 넘긴 태그만 반환(9→10은 포함, 10→11은 미포함)
  - `intensityLevel`이 임계값(0/1/3/6/10 — 제안 기본값)별로 0~4 단계를 반환
  - `bun run typecheck`

### Task 2: 세트 완료 시 게임화 상태 갱신 (hook 통합) ✅

- **담당 판정 기준**: INV-2
- **크기**: S
- **의존성**: Task 1 (`lib/gamification.ts`, `lib/storage.ts`)
- **참조**:
  - `artifacts/edutrain/learnings.md` — triggers: `hydration`(localStorage 값은 `useState` 초기화 함수가 아니라 마운트 후 `useEffect`에서 읽어야 SSR/CSR mismatch를 피함), `completeSet`(세션 완료 시 영속화는 훅의 단일 액션에서 처리), `약점 태그 불일치`(화면 전환 조건과 다음 화면 데이터는 같은 소스에서 파생)
  - `hooks/use-edutrain.ts` 기존 `completeSet` 구현
- **구현 대상**:
  - `hooks/use-edutrain.ts` (Modify): `gamification` state를 `EMPTY_GAMIFICATION`으로 초기화 후 마운트 `useEffect`에서 `storage.loadGamification()`으로 채움(하이드레이션 안전 패턴 준수). `completeSet` 내부에서 `recordSessionGamification` 호출·`storage.saveGamification` 영속화. 완료 전/후 값을 비교해 `lastCompletionNotice: { newBadges: string[]; leveledUp: boolean } | null` state 설정
  - 테스트: `hooks/use-edutrain.test.ts` (Modify)
- **검증**: Vitest(`renderHook`+`act`, jsdom localStorage).
  - `completeSet` 호출 후 `gamification.levelScore`·`tagCounts`·`dailyActivity`가 갱신되고 `storage.loadGamification()`으로 재로드해도 동일 `[INV-2]`
  - 레벨 경계를 넘기는 완료 직후 `lastCompletionNotice.leveledUp`이 true
  - 10문항째를 완료한 직후 `lastCompletionNotice.newBadges`에 해당 태그 포함
  - `gamification` state 초기화가 `useState(() => storage.load...())` 형태가 아님을 코드 리뷰로 확인 (하이드레이션 회귀 방지)
  - `bun run typecheck`

---

### Checkpoint: Tasks 1~2 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh gamification --tests`
- [ ] 게임화 데이터가 세트 완료마다 정확히 계산·영속화됨 (UI 노출은 다음 Task들)

---

### Task 3: 홈 화면 — 잔디 캘린더 ✅

- **담당 판정 기준**: S1-1, S1-2, S1-3, S1-4, S2
- **크기**: M
- **의존성**: Task 1(계산 로직), Task 2(훅이 `gamification.dailyActivity` 제공)
- **참조**:
  - vercel-react-best-practices (365개 셀 리스트 렌더 — 안정적인 key, 불필요 리렌더 방지)
  - `lib/gamification.ts`의 `buildGrassGrid`/`intensityLevel`
- **구현 대상**:
  - `components/edutrain/grass-calendar.tsx`: `buildGrassGrid`로 최근 365일 그리드 계산, 강도별 시각 상태(0~4단계) 렌더. 각 칸에 날짜·문항 수를 담은 `title`(접근성 대체 정보) 포함
  - `components/edutrain/home.tsx` (Modify): `HomeProps`에 `gamification: GamificationState` 추가, `<GrassCalendar dailyActivity={gamification.dailyActivity} />` 통합
  - `app/page.tsx` (Modify): 훅의 `gamification`을 `<Home gamification={gamification} .../>`로 전달
  - 테스트: `components/edutrain/grass-calendar.test.tsx`
- **검증**: Vitest + Testing Library. `[S1-1]`,`[S1-2]`,`[S1-3]`,`[S1-4]` 인용.
  - 365일치 칸이 렌더된다(오늘 포함) `[S1-1]`
  - 문항 수가 다른 두 날짜가 서로 다른 시각 상태(class/속성)로 렌더된다 `[S1-2]`
  - 활동이 없는 날은 빈 칸 상태로 렌더된다 `[S1-3]`
  - `dailyActivity`에 없는 날짜(이 기능 도입 이전 활동을 상정)는 0으로 처리되어 빈 칸으로 렌더된다(새 store 자체가 과거 데이터를 담지 않으므로 자연히 만족) `[S1-4]`
  - Browser MCP: 실제 앱에서 오늘 세트를 완료한 뒤 홈 재진입 → 오늘 칸의 시각 상태 변화 확인, 증거 `artifacts/gamification/evidence/task3.png` `[S2]`

### Task 4: 홈 화면 — 관심사 배지 목록 ✅

- **담당 판정 기준**: S3-2, S4, S5-1, S5-2
- **크기**: S
- **의존성**: Task 1, Task 2 (`gamification.tagCounts`)
- **참조**:
  - shadcn (`components/ui/badge.tsx` 재사용, 직접 수정 금지)
  - `lib/gamification.ts`의 `deriveBadges`
- **구현 대상**:
  - `components/edutrain/badge-list.tsx`: `deriveBadges(tagCounts)`로 획득 배지 계산, 목록 또는 빈 상태 렌더
  - `components/edutrain/home.tsx` (Modify): `<BadgeList tagCounts={gamification.tagCounts} />` 통합
  - 테스트: `components/edutrain/badge-list.test.tsx`
- **검증**: Vitest + Testing Library. `[S3-2]`,`[S4]`,`[S5-1]`,`[S5-2]` 인용.
  - 특정 태그 count=10 → 그 태그 배지가 표시된다 `[S3-2]`,`[S5-1]`
  - count=9인 태그는 배지가 표시되지 않는다 `[S4]`
  - 배지가 하나도 없으면 "아직 획득한 배지가 없습니다"(제안 기본값) `[S5-2]`

### Task 5: 홈 화면 — 레벨 카드 ✅

- **담당 판정 기준**: S6-1, S6-2
- **크기**: S
- **의존성**: Task 1, Task 2 (`gamification.levelScore`)
- **참조**:
  - shadcn (`components/ui/progress.tsx` 재사용, 직접 수정 금지)
  - `lib/gamification.ts`의 `levelForScore`/`levelProgress`
- **구현 대상**:
  - `components/edutrain/level-card.tsx`: `levelProgress(levelScore)`로 레벨·다음 레벨까지 진행률 계산, `Progress` 컴포넌트로 표시
  - `components/edutrain/home.tsx` (Modify): `<LevelCard levelScore={gamification.levelScore} />` 통합
  - 테스트: `components/edutrain/level-card.test.tsx`
- **검증**: Vitest + Testing Library. `[S6-1]`,`[S6-2]` 인용.
  - levelScore=250 → "레벨 1" 표시 `[S6-1]`
  - levelScore=250 → 진행률 50%(250/500) 표시 `[S6-2]`

---

### Checkpoint: Tasks 3~5 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 커버리지 검사: `scripts/spec-coverage.sh gamification --tests`
- [ ] 홈 화면에 잔디·배지·레벨이 모두 통합되어 표시됨 (Browser MCP로 실제 렌더 확인)

---

### Task 6: 결과 화면 — 배지·레벨업 알림

- **담당 판정 기준**: S3-1, S7
- **크기**: S
- **의존성**: Task 2 (`lastCompletionNotice`)
- **참조**:
  - `components/edutrain/result-view.tsx` 기존 구현 (약점 배너와 동일한 위치에 알림 섹션 추가)
- **구현 대상**:
  - `components/edutrain/result-view.tsx` (Modify): `newBadges: string[]`, `leveledUp: boolean` prop 추가, 값이 있으면 "새 배지 획득: {태그}"/"레벨업!"(제안 기본값) 배너 렌더
  - `app/page.tsx` (Modify): `lastCompletionNotice`를 `<ResultView newBadges={...} leveledUp={...} />`로 전달
  - 테스트: `components/edutrain/result-view.test.tsx` (Modify)
- **검증**: Vitest + Testing Library. `[S3-1]`,`[S7]` 인용.
  - `newBadges=["이진탐색"]` → "새 배지 획득: 이진탐색"(제안 기본값) 표시 `[S3-1]`
  - `leveledUp=true` → "레벨업!"(제안 기본값) 표시 `[S7]`
  - 값이 없으면(빈 배열, false) 알림이 표시되지 않는다(회귀 방지)

---

### 최종 Checkpoint
- [ ] 모든 테스트 통과 / 빌드 성공 / `scripts/spec-coverage.sh gamification --tests`
- [ ] spec.md의 **End-to-end 검증** 절차를 실행하고, 통과한 판정 기준 체크박스를 spec.md에서 켠다. 실제 Gemini 호출 없이 fetch stub으로 여러 세트를 반복 완료시켜 검증한다(사용자 요청: 문제 생성·풀이 자체는 재검증하지 않음 — 이번 검증 대상은 게임화 트리거·표시뿐)
- [ ] INV-2: 새로고침 후 잔디·배지·레벨이 유지되는지 Browser MCP로 확인

## 미결정 항목

없음 — spec.md 확정 시점에 모든 항목이 결정됨. 강도 임계값(0/1/3/6/10)과 배지·레벨업 알림 문구는 제안 기본값이며 사용 후 조정 가능.
