import { describe, it, expect } from "vitest";
import {
  weakTagsFromResults,
  updateWeaknesses,
  activeWeakTags,
} from "@/lib/weakness";
import type { AnswerResult, Question, WeaknessEntry } from "@/types/quiz";

function q(id: string, tags: string[]): Question {
  return { id, type: "mc", prompt: "Q", tags, difficulty: "medium", choices: ["a", "b"], answer: "a" };
}
function res(questionId: string, correct: boolean): AnswerResult {
  return { questionId, given: "g", correct, score: correct ? 100 : 0 };
}

describe("weakTagsFromResults", () => {
  it("틀린 문항의 태그만 약점 주제로 모은다", () => {
    const questions = [q("1", ["미분"]), q("2", ["적분"]), q("3", ["극한"])];
    const results = [res("1", false), res("2", true), res("3", false)];
    expect(weakTagsFromResults(questions, results).sort()).toEqual(["극한", "미분"]);
  });
});

describe("updateWeaknesses", () => {
  it("틀린 문항의 태그는 wrongCount가 증가한다", () => {
    const next = updateWeaknesses([], [q("1", ["미분"])], [res("1", false)]);
    const 미분 = next.find((e) => e.tag === "미분");
    expect(미분?.wrongCount).toBe(1);
    expect(미분?.mastered).toBe(false);
  });

  it("[S6-2] 약점 태그의 문항을 이후 맞히면 약점 목록에서 빠지거나 완화된다", () => {
    const prev: WeaknessEntry[] = [{ tag: "미분", wrongCount: 1, mastered: false }];
    const next = updateWeaknesses(prev, [q("1", ["미분"])], [res("1", true)]);
    const 미분 = next.find((e) => e.tag === "미분");
    expect(미분?.wrongCount).toBe(0);
    expect(미분?.mastered).toBe(true);
    // 활성 약점 목록에서 제외된다
    expect(activeWeakTags(next)).not.toContain("미분");
  });

  it("[S6-2] 여러 번 틀린 태그는 한 번 맞혀도 완화만 되고 즉시 사라지지 않는다", () => {
    const prev: WeaknessEntry[] = [{ tag: "미분", wrongCount: 2, mastered: false }];
    const next = updateWeaknesses(prev, [q("1", ["미분"])], [res("1", true)]);
    const 미분 = next.find((e) => e.tag === "미분");
    expect(미분?.wrongCount).toBe(1);
    expect(미분?.mastered).toBe(false);
    expect(activeWeakTags(next)).toContain("미분");
  });
});
