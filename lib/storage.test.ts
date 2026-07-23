import { describe, it, expect, beforeEach } from "vitest";
import {
  addMaterial,
  loadMaterials,
  addSession,
  loadSessions,
  saveStats,
  loadStats,
  saveWeaknesses,
  loadWeaknesses,
  clearAll,
} from "@/lib/storage";
import { cumulativeScoreFromSessions } from "@/lib/stats";
import type { Material, SessionRecord, Stats, WeaknessEntry } from "@/types/quiz";

const material: Material = { id: "m1", title: "미적분", content: "본문", createdAt: 1 };
const session: SessionRecord = {
  id: "s1", materialId: "m1", score: 300, total: 400, weakTags: ["미분"], completedAt: 2,
};
const stats: Stats = { cumulativeScore: 300, streakDays: 2, lastStudyDate: "2026-07-23", bestCorrectStreak: 3 };
const weaknesses: WeaknessEntry[] = [{ tag: "미분", wrongCount: 1, mastered: false }];

describe("storage 영속성", () => {
  beforeEach(() => {
    clearAll();
  });

  it("[INV-2] 저장 후 재로드하면 자료·이력·통계·약점이 유지된다", () => {
    addMaterial(material);
    addSession(session);
    saveStats(stats);
    saveWeaknesses(weaknesses);

    // 새로고침을 흉내: 새로 load 하면 localStorage에서 다시 읽어온다.
    expect(loadMaterials()).toEqual([material]);
    expect(loadSessions()).toEqual([session]);
    expect(loadStats()).toEqual(stats);
    expect(loadWeaknesses()).toEqual(weaknesses);
  });

  it("[INV-3] 로드한 누적 점수는 저장된 세션 이력의 점수 합과 일치한다", () => {
    addSession(session);
    addSession({ ...session, id: "s2", score: 200 });
    saveStats({ ...stats, cumulativeScore: 500 });

    const loaded = loadStats();
    expect(loaded.cumulativeScore).toBe(cumulativeScoreFromSessions(loadSessions()));
  });

  it("빈 상태에서는 기본값을 돌려준다", () => {
    expect(loadMaterials()).toEqual([]);
    expect(loadSessions()).toEqual([]);
    expect(loadStats().cumulativeScore).toBe(0);
    expect(loadWeaknesses()).toEqual([]);
  });
});
