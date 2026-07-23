import { describe, it, expect, vi, beforeEach } from "vitest";

const { gradeEssayMock } = vi.hoisted(() => ({
  gradeEssayMock: vi.fn(),
}));

vi.mock("@/services/gemini", () => ({
  gradeEssay: gradeEssayMock,
}));

import { POST } from "@/app/api/grade/route";

function req(body: unknown) {
  return new Request("http://localhost/api/grade", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const KEY = "test-secret-key-abc123";

describe("POST /api/grade", () => {
  beforeEach(() => {
    gradeEssayMock.mockReset();
    process.env.GEMINI_API_KEY = KEY;
  });

  it("[S3-1] 답안 채점 결과 { score, feedback }를 반환한다", async () => {
    gradeEssayMock.mockResolvedValueOnce({ score: 80, feedback: "좋습니다." });

    const res = await POST(req({ prompt: "Q", rubric: "R", answer: "내 답안" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.score).toBe(80);
    expect(json.feedback).toBe("좋습니다.");
  });

  it("[S3-2] 빈 답안이면 채점을 호출하지 않고 400을 반환한다", async () => {
    const res = await POST(req({ prompt: "Q", answer: "   " }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("답안을 입력하세요");
    expect(gradeEssayMock).not.toHaveBeenCalled();
  });

  it("[INV-1] 채점 실패 시 에러 메시지에 키가 섞여도 응답에는 새지 않는다", async () => {
    gradeEssayMock.mockRejectedValueOnce(new Error(`auth fail key=${KEY}`));

    const res = await POST(req({ prompt: "Q", answer: "답안" }));
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).not.toContain(KEY);
  });
});
