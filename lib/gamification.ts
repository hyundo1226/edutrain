// 게임화(잔디·관심사 배지·레벨) 계산 로직. 의존성: types.
// 날짜는 항상 매개변수로 받는다 (lib/stats.ts 컨벤션과 동일) — 순수 함수 유지, 결정론적 테스트.
import type { AnswerResult, GamificationState, Question } from "@/types/quiz";

export const EMPTY_GAMIFICATION: GamificationState = {
  levelScore: 0,
  tagCounts: {},
  dailyActivity: {},
};

export const LEVEL_INTERVAL = 500;
export const BADGE_THRESHOLD = 10;

/** 문항 채점 결과를 게임화 상태에 반영한다. 같은 날짜로 여러 번 호출하면 누적된다 (S2). */
export function recordSessionGamification(
  prev: GamificationState,
  questions: Question[],
  results: AnswerResult[],
  today: string,
): GamificationState {
  const score = results.reduce((sum, r) => sum + r.score, 0);
  const byId = new Map(questions.map((q) => [q.id, q]));

  const tagCounts = { ...prev.tagCounts };
  for (const r of results) {
    const question = byId.get(r.questionId);
    question?.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  }

  const dailyActivity = { ...prev.dailyActivity };
  dailyActivity[today] = (dailyActivity[today] ?? 0) + results.length;

  return {
    levelScore: prev.levelScore + score,
    tagCounts,
    dailyActivity,
  };
}

/** 누적 점수를 레벨로 변환한다. LEVEL_INTERVAL점당 1레벨, 1레벨부터 시작 (S6-1). */
export function levelForScore(score: number): number {
  return Math.floor(Math.max(0, score) / LEVEL_INTERVAL) + 1;
}

export interface LevelProgress {
  level: number;
  into: number; // 현재 레벨 안에서 쌓인 점수
  span: number; // 한 레벨의 크기 (LEVEL_INTERVAL)
}

/** 다음 레벨까지 남은 진행률 정보 (S6-2). */
export function levelProgress(score: number): LevelProgress {
  const level = levelForScore(score);
  const into = Math.max(0, score) - (level - 1) * LEVEL_INTERVAL;
  return { level, into, span: LEVEL_INTERVAL };
}

/** 점수 변화로 레벨 경계를 넘겼는지 (S7). */
export function didLevelUp(prevScore: number, nextScore: number): boolean {
  return levelForScore(nextScore) > levelForScore(prevScore);
}

/** count가 BADGE_THRESHOLD 이상인 태그를 배지로 파생한다. 별도로 저장하지 않고 매번 계산한다. */
export function deriveBadges(tagCounts: Record<string, number>): string[] {
  return Object.entries(tagCounts)
    .filter(([, count]) => count >= BADGE_THRESHOLD)
    .map(([tag]) => tag);
}

/** 이번 갱신에서 막 임계값을 넘겨 새로 배지를 얻은 태그만 반환한다 (S3-1 알림 트리거). */
export function newlyEarnedBadges(
  prevTagCounts: Record<string, number>,
  nextTagCounts: Record<string, number>,
): string[] {
  const prevBadges = new Set(deriveBadges(prevTagCounts));
  return deriveBadges(nextTagCounts).filter((tag) => !prevBadges.has(tag));
}

// 잔디 강도 구간 (제안 기본값): 0문항=0단계, 1~2=1단계, 3~5=2단계, 6~9=3단계, 10+=4단계.
const INTENSITY_STEPS: readonly number[] = [0, 1, 3, 6, 10];

export function intensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  let level = 0;
  for (let i = INTENSITY_STEPS.length - 1; i >= 0; i--) {
    if (count >= INTENSITY_STEPS[i]) {
      level = i;
      break;
    }
  }
  return level as 0 | 1 | 2 | 3 | 4;
}

export interface GrassDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** todayDate를 포함해 최근 days일치 잔디 그리드를 만든다 (S1-1). */
export function buildGrassGrid(
  dailyActivity: Record<string, number>,
  todayDate: Date,
  days = 365,
): GrassDay[] {
  const result: GrassDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    const count = dailyActivity[key] ?? 0;
    result.push({ date: key, count, level: intensityLevel(count) });
  }
  return result;
}
