import { NextResponse } from "next/server";
import { generateQuestions } from "@/services/gemini";
import type { GenerateParams } from "@/types/quiz";

// 서버 전용 런타임 (API 키가 클라이언트로 새지 않도록, INV-1).
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: GenerateParams;
  try {
    body = (await request.json()) as GenerateParams;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  if (!body?.material || body.material.trim().length === 0) {
    return NextResponse.json(
      { error: "학습자료를 입력하세요" },
      { status: 400 },
    );
  }

  try {
    const questions = await generateQuestions(body);
    return NextResponse.json({ questions });
  } catch (error) {
    // 실제 원인은 서버 로그로만 남기고, 클라이언트에는 일반 메시지만 노출한다 (INV-1).
    console.error("[/api/generate] 생성 실패:", error);
    return NextResponse.json(
      { error: "문제 생성에 실패했습니다" },
      { status: 500 },
    );
  }
}
