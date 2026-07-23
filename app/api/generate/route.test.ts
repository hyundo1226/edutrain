import { describe, it, expect, vi, beforeEach } from "vitest";

// 서비스 계층을 mock한다 (Gemini 네트워크 호출 격리).
const { generateQuestionsMock } = vi.hoisted(() => ({
  generateQuestionsMock: vi.fn(),
}));

vi.mock("@/services/gemini", () => ({
  generateQuestions: generateQuestionsMock,
}));

import { POST } from "@/app/api/generate/route";

function req(body: unknown) {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const KEY = "test-secret-key-abc123";

describe("POST /api/generate", () => {
  beforeEach(() => {
    generateQuestionsMock.mockReset();
    process.env.GEMINI_API_KEY = KEY;
  });

  it("[S1-5] 성공 시 생성된 문항 배열을 반환한다", async () => {
    generateQuestionsMock.mockResolvedValueOnce([
      { id: "1", type: "mc", prompt: "Q", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
    ]);

    const res = await POST(req({ material: "자료", types: ["mc"], difficulty: "medium", count: 1 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.questions).toHaveLength(1);
    expect(json.questions[0].tags.length).toBeGreaterThanOrEqual(1);
  });

  it("[INV-1] 성공 응답 본문 어디에도 API 키 문자열이 포함되지 않는다", async () => {
    generateQuestionsMock.mockResolvedValueOnce([
      { id: "1", type: "mc", prompt: "Q", tags: ["t"], difficulty: "medium", choices: ["a"], answer: "a" },
    ]);

    const res = await POST(req({ material: "자료", types: ["mc"], difficulty: "medium", count: 1 }));
    const text = await res.text();

    expect(text).not.toContain(KEY);
  });

  it("[INV-1] 서비스 에러 메시지에 키가 섞여도 응답 본문에는 키가 새지 않는다", async () => {
    // 최악의 경우: 에러 메시지에 키가 포함되어도 클라이언트로 새면 안 된다.
    generateQuestionsMock.mockRejectedValueOnce(new Error(`Gemini 인증 실패 key=${KEY}`));

    const res = await POST(req({ material: "자료", types: ["mc"], difficulty: "medium", count: 1 }));
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).not.toContain(KEY);
  });

  it("[S1-3] 빈 자료로 요청하면 400과 안내 메시지를 반환하고 생성을 호출하지 않는다", async () => {
    const res = await POST(req({ material: "   ", types: ["mc"], difficulty: "medium", count: 5 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("학습자료를 입력하세요");
    expect(generateQuestionsMock).not.toHaveBeenCalled();
  });
});
