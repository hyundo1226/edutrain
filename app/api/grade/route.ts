import { NextResponse } from "next/server";
import { gradeEssay } from "@/services/gemini";
import type { GradeEssayParams } from "@/types/quiz";

// 서버 전용 런타임 (API 키가 클라이언트로 새지 않도록, INV-1).
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: GradeEssayParams;
  try {
    body = (await request.json()) as GradeEssayParams;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  if (!body?.answer || body.answer.trim().length === 0) {
    return NextResponse.json({ error: "답안을 입력하세요" }, { status: 400 });
  }

  try {
    const grade = await gradeEssay(body);
    return NextResponse.json(grade);
  } catch (error) {
    console.error("[/api/grade] 채점 실패:", error);
    return NextResponse.json(
      { error: "채점에 실패했습니다" },
      { status: 500 },
    );
  }
}
