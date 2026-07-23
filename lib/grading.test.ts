import { describe, it, expect } from "vitest";
import { gradeObjective, normalizeAnswer } from "@/lib/grading";
import type { Question } from "@/types/quiz";

function shortQ(answer: string): Question {
  return { id: "q1", type: "short", prompt: "정답은?", tags: ["t"], difficulty: "easy", answer };
}

function mcQ(answer: string, choices: string[]): Question {
  return { id: "q2", type: "mc", prompt: "고르시오", tags: ["t"], difficulty: "easy", choices, answer };
}

describe("gradeObjective", () => {
  it("[S2-3] 단답형은 대소문자 차이를 무시하고 정답 처리한다", () => {
    const r = gradeObjective(shortQ("Mitochondria"), "mitochondria");
    expect(r.correct).toBe(true);
    expect(r.score).toBe(100);
  });

  it("[S2-3] 단답형은 앞뒤 공백 차이를 무시하고 정답 처리한다", () => {
    const r = gradeObjective(shortQ("42"), "  42  ");
    expect(r.correct).toBe(true);
  });

  it("[S2-3] 단답형 오답은 오답 처리하고 0점", () => {
    const r = gradeObjective(shortQ("42"), "43");
    expect(r.correct).toBe(false);
    expect(r.score).toBe(0);
  });

  it("객관식 정답 보기를 고르면 정답 처리한다", () => {
    const r = gradeObjective(mcQ("파리", ["런던", "파리", "베를린"]), "파리");
    expect(r.correct).toBe(true);
    expect(r.score).toBe(100);
  });

  it("객관식 오답 보기를 고르면 오답 처리한다", () => {
    const r = gradeObjective(mcQ("파리", ["런던", "파리", "베를린"]), "런던");
    expect(r.correct).toBe(false);
  });

  it("결과에 questionId와 given이 담긴다", () => {
    const r = gradeObjective(shortQ("답"), "답");
    expect(r.questionId).toBe("q1");
    expect(r.given).toBe("답");
  });
});

describe("normalizeAnswer", () => {
  it("앞뒤 공백 제거 + 소문자화 + 내부 공백 축약", () => {
    expect(normalizeAnswer("  Hello   World  ")).toBe("hello world");
  });
});
