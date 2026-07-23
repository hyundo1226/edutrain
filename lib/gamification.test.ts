import { describe, it, expect } from "vitest";
import {
  EMPTY_GAMIFICATION,
  BADGE_THRESHOLD,
  LEVEL_INTERVAL,
  recordSessionGamification,
  levelForScore,
  levelProgress,
  didLevelUp,
  deriveBadges,
  newlyEarnedBadges,
  intensityLevel,
  buildGrassGrid,
} from "@/lib/gamification";
import type { AnswerResult, GamificationState, Question, Stats } from "@/types/quiz";

function q(id: string, tags: string[]): Question {
  return { id, type: "mc", prompt: "P", tags, difficulty: "medium", choices: ["a"], answer: "a" };
}
function r(questionId: string, correct: boolean, score = correct ? 100 : 0): AnswerResult {
  return { questionId, given: "g", correct, score };
}

describe("recordSessionGamification", () => {
  it("[INV-1] 기존 Stats.cumulativeScore나 SessionRecord 이력과 무관하게 EMPTY_GAMIFICATION에서 항상 0부터 누적을 시작한다", () => {
    // 기존 누적 점수가 아무리 커도(예: 이 기능 도입 전 세션들의 결과) gamification은 영향받지 않는다.
    const preexistingStats: Stats = {
      cumulativeScore: 999999,
      streakDays: 30,
      lastStudyDate: "2020-01-01",
      bestCorrectStreak: 50,
    };
    void preexistingStats; // 이 값이 recordSessionGamification의 인자로 쓰이지 않음을 타입상으로도 보인다.

    const next = recordSessionGamification(
      EMPTY_GAMIFICATION,
      [q("1", ["A"])],
      [r("1", true)],
      "2026-07-23",
    );
    expect(next.levelScore).toBe(100);
    expect(next.tagCounts).toEqual({ A: 1 });
  });

  it("[S2] 같은 날짜로 두 번 호출(같은 날 세트 2회 완료)하면 dailyActivity와 tagCounts가 누적된다(덮어쓰지 않는다)", () => {
    const first = recordSessionGamification(
      EMPTY_GAMIFICATION,
      [q("1", ["A"]), q("2", ["B"])],
      [r("1", true), r("2", false)],
      "2026-07-23",
    );
    const second = recordSessionGamification(
      first,
      [q("3", ["A"]), q("4", ["A"])],
      [r("3", true), r("4", true)],
      "2026-07-23",
    );

    expect(second.dailyActivity["2026-07-23"]).toBe(4); // 2 + 2
    expect(second.tagCounts).toEqual({ A: 3, B: 1 }); // A: 1+2, B: 1+0
  });

  it("문항 하나에 태그가 여러 개면 각 태그 카운트가 모두 증가한다", () => {
    const next = recordSessionGamification(
      EMPTY_GAMIFICATION,
      [q("1", ["A", "B"])],
      [r("1", true)],
      "2026-07-23",
    );
    expect(next.tagCounts).toEqual({ A: 1, B: 1 });
  });
});

describe("levelForScore / levelProgress / didLevelUp", () => {
  it("[S6-1] 500점 간격으로 레벨이 오른다 (1레벨부터 시작)", () => {
    expect(levelForScore(0)).toBe(1);
    expect(levelForScore(499)).toBe(1);
    expect(levelForScore(500)).toBe(2);
    expect(levelForScore(999)).toBe(2);
    expect(levelForScore(1000)).toBe(3);
  });

  it("[S6-2] levelProgress가 다음 레벨까지 남은 진행률 정보를 반환한다", () => {
    const p = levelProgress(250);
    expect(p.level).toBe(1);
    expect(p.into).toBe(250);
    expect(p.span).toBe(LEVEL_INTERVAL);
  });

  it("[S7] 레벨 경계를 넘기면 didLevelUp이 true, 아니면 false", () => {
    expect(didLevelUp(499, 500)).toBe(true);
    expect(didLevelUp(400, 499)).toBe(false);
    expect(didLevelUp(500, 999)).toBe(false);
  });
});

describe("deriveBadges / newlyEarnedBadges", () => {
  it("[S4][S5-1] count가 BADGE_THRESHOLD 이상인 태그만 배지로 반환한다", () => {
    const tagCounts = { A: BADGE_THRESHOLD, B: BADGE_THRESHOLD - 1 };
    expect(deriveBadges(tagCounts)).toEqual(["A"]);
  });

  it("[S3-1] newlyEarnedBadges는 이번 호출에서 막 임계값을 넘긴 태그만 반환한다", () => {
    const prev = { A: BADGE_THRESHOLD - 1 };
    const next = { A: BADGE_THRESHOLD };
    expect(newlyEarnedBadges(prev, next)).toEqual(["A"]);

    // 이미 배지를 가진 태그가 더 늘어나도 "새로" 획득한 것은 아니다.
    const prev2 = { A: BADGE_THRESHOLD };
    const next2 = { A: BADGE_THRESHOLD + 1 };
    expect(newlyEarnedBadges(prev2, next2)).toEqual([]);
  });
});

describe("intensityLevel", () => {
  it("[S1-2] 문항 수 구간별로 0~4단계 강도를 반환한다", () => {
    expect(intensityLevel(0)).toBe(0);
    expect(intensityLevel(1)).toBe(1);
    expect(intensityLevel(2)).toBe(1);
    expect(intensityLevel(3)).toBe(2);
    expect(intensityLevel(5)).toBe(2);
    expect(intensityLevel(6)).toBe(3);
    expect(intensityLevel(9)).toBe(3);
    expect(intensityLevel(10)).toBe(4);
    expect(intensityLevel(100)).toBe(4);
  });
});

describe("buildGrassGrid", () => {
  it("[S1-1] 오늘을 포함해 최근 365일치 칸을 만든다", () => {
    const grid = buildGrassGrid({}, new Date("2026-07-23T00:00:00"), 365);
    expect(grid).toHaveLength(365);
    expect(grid[grid.length - 1].date).toBe("2026-07-23");
  });

  it("[S1-3] dailyActivity에 없는 날짜는 count 0, 강도 0(빈 칸)이다", () => {
    const grid = buildGrassGrid({}, new Date("2026-07-23T00:00:00"), 7);
    expect(grid.every((d) => d.count === 0 && d.level === 0)).toBe(true);
  });

  it("[S1-2] dailyActivity에 값이 있는 날짜는 해당 강도로 반영된다", () => {
    const grid = buildGrassGrid(
      { "2026-07-23": 10 },
      new Date("2026-07-23T00:00:00"),
      7,
    );
    const today = grid[grid.length - 1];
    expect(today.count).toBe(10);
    expect(today.level).toBe(4);
  });

  it("[S1-4] 이 기능 도입 이전 활동을 상정한 임의의 과거 dailyActivity가 있어도, grid 범위 밖 날짜는 반영되지 않는다(새 store는애초에 그런 값을 갖지 않음을 재확인)", () => {
    const grid = buildGrassGrid(
      { "2000-01-01": 999 }, // 범위 밖(365일보다 훨씬 이전) 데이터 — 실제로는 존재할 수 없지만 방어 확인
      new Date("2026-07-23T00:00:00"),
      7,
    );
    expect(grid.some((d) => d.date === "2000-01-01")).toBe(false);
    expect(grid.every((d) => d.count === 0)).toBe(true);
  });
});
