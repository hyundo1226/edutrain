import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Question } from "@/types/quiz";

// @google/genai 모듈을 mock한다. 실제 네트워크 호출 없이 파싱·프롬프트만 검증한다.
const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
  // Type enum은 스키마 빌드에만 쓰이므로 프로퍼티명을 그대로 돌려준다.
  Type: new Proxy({}, { get: (_t, p) => p }),
}));

import { generateQuestions, gradeEssay } from "@/services/gemini";

function mockQuestions(qs: Array<Partial<Question>>) {
  generateContentMock.mockResolvedValueOnce({ text: JSON.stringify(qs) });
}

describe("generateQuestions", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "test-secret-key-abc123";
  });

  it("[S1-5] 파싱된 각 문항은 주제 태그가 1개 이상이고, 요청 유형/개수가 요청에 반영된다", async () => {
    mockQuestions([
      { type: "mc", prompt: "Q1", tags: ["미분"], difficulty: "medium", choices: ["a", "b"], answer: "a" },
      { type: "mc", prompt: "Q2", tags: ["적분"], difficulty: "medium", choices: ["a", "b"], answer: "b" },
      { type: "mc", prompt: "Q3", tags: ["극한", "미분"], difficulty: "medium", choices: ["a", "b"], answer: "a" },
      { type: "mc", prompt: "Q4", tags: ["연속"], difficulty: "medium", choices: ["a", "b"], answer: "b" },
      { type: "mc", prompt: "Q5", tags: ["미분"], difficulty: "medium", choices: ["a", "b"], answer: "a" },
    ]);

    const questions = await generateQuestions({
      material: "미적분 기초 자료",
      types: ["mc"],
      difficulty: "medium",
      count: 5,
    });

    // 파싱: 각 문항에 태그 1개 이상 + 고유 id 부여
    expect(questions).toHaveLength(5);
    for (const q of questions) {
      expect(q.tags.length).toBeGreaterThanOrEqual(1);
      expect(q.id).toBeTruthy();
    }
    expect(new Set(questions.map((q) => q.id)).size).toBe(5);

    // 요청 반영: 프롬프트에 요청 개수와 유형이 담긴다
    const prompt = generateContentMock.mock.calls[0][0].contents as string;
    expect(prompt).toContain("5");
    expect(prompt).toContain("객관식");
  });

  it("[버그 수정] 프롬프트가 answer를 choices와 완전히 동일한 문자열로 명시적으로 요구한다 (Gemini가 'B' 같은 라벨만 반환하던 실제 버그 재발 방지)", async () => {
    mockQuestions([
      { type: "mc", prompt: "Q", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
    ]);

    await generateQuestions({
      material: "자료",
      types: ["mc"],
      difficulty: "medium",
      count: 1,
    });

    const prompt = generateContentMock.mock.calls[0][0].contents as string;
    expect(prompt).toContain("완전히 동일한 문자열");
    expect(prompt).toContain("라벨만 적지 말고");
  });

  it("[S6-1] weakTags를 전달하면 프롬프트에 약점 태그 우선 출제 지시가 포함된다", async () => {
    mockQuestions([
      { type: "mc", prompt: "Q", tags: ["미분"], difficulty: "medium", choices: ["a"], answer: "a" },
    ]);

    await generateQuestions({
      material: "자료",
      types: ["mc"],
      difficulty: "medium",
      count: 3,
      weakTags: ["미분", "극한"],
    });

    const prompt = generateContentMock.mock.calls[0][0].contents as string;
    expect(prompt).toContain("미분");
    expect(prompt).toContain("극한");
    expect(prompt).toContain("우선"); // 우선 출제 지시
  });

  it("[INV-1] API 키는 process.env에서만 읽고, 반환값에는 키가 포함되지 않는다", async () => {
    mockQuestions([
      { type: "mc", prompt: "Q", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
    ]);

    const questions = await generateQuestions({
      material: "자료",
      types: ["mc"],
      difficulty: "medium",
      count: 1,
    });

    expect(JSON.stringify(questions)).not.toContain("test-secret-key-abc123");
  });
});

describe("getClient 에러 경로 (독립 리뷰에서 발견한 커버리지 공백)", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("GEMINI_API_KEY가 없으면 generateQuestions가 명확한 에러로 실패한다", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      generateQuestions({ material: "자료", types: ["mc"], difficulty: "medium", count: 1 }),
    ).rejects.toThrow("GEMINI_API_KEY");
  });

  it("GEMINI_API_KEY가 없으면 gradeEssay도 명확한 에러로 실패한다", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(gradeEssay({ prompt: "Q", answer: "A" })).rejects.toThrow(
      "GEMINI_API_KEY",
    );
  });
});

describe("gradeEssay", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "test-secret-key-abc123";
  });

  it("[S3-1] 답안을 채점하면 { score: 0~100, feedback: string } 형태로 반환한다", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({ score: 72, feedback: "핵심은 맞았으나 근거가 부족합니다." }),
    });

    const grade = await gradeEssay({ prompt: "설명하라", rubric: "핵심 개념 포함", answer: "내 답안" });

    expect(grade.score).toBeGreaterThanOrEqual(0);
    expect(grade.score).toBeLessThanOrEqual(100);
    expect(grade.score).toBe(72);
    expect(typeof grade.feedback).toBe("string");
    expect(grade.feedback.length).toBeGreaterThan(0);
  });

  it("[S3-1] 모델이 범위를 벗어난 점수를 주면 0~100으로 클램프한다", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({ score: 140, feedback: "훌륭합니다." }),
    });

    const grade = await gradeEssay({ prompt: "Q", answer: "A" });
    expect(grade.score).toBe(100);
  });
});
