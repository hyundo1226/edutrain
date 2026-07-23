import { describe, it, expect } from "vitest";
import { scoreSet } from "@/lib/scoring";
import type { AnswerResult } from "@/types/quiz";

function result(correct: boolean, score: number): AnswerResult {
  return { questionId: "q", given: "g", correct, score };
}

describe("scoreSet", () => {
  it("만점 대비 획득 점수와 백분율을 계산한다", () => {
    const s = scoreSet([result(true, 100), result(false, 0), result(true, 100), result(false, 0)]);
    expect(s.total).toBe(400);
    expect(s.score).toBe(200);
    expect(s.percentage).toBe(50);
    expect(s.correctCount).toBe(2);
    expect(s.count).toBe(4);
  });

  it("서술형 부분점수를 반영해 백분율을 계산한다", () => {
    const s = scoreSet([result(true, 100), result(false, 60)]);
    expect(s.total).toBe(200);
    expect(s.score).toBe(160);
    expect(s.percentage).toBe(80);
  });

  it("빈 결과는 0으로 처리한다 (0 나눗셈 방지)", () => {
    const s = scoreSet([]);
    expect(s.total).toBe(0);
    expect(s.percentage).toBe(0);
  });
});
