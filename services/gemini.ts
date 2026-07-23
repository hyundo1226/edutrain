// Gemini 호출 서비스. 서버 전용 (Route Handler에서만 import). 의존성: types, lib.
// API 키는 process.env.GEMINI_API_KEY에서만 읽는다 (INV-1).
import { GoogleGenAI } from "@google/genai";
import type {
  EssayGrade,
  GenerateParams,
  GradeEssayParams,
  Question,
} from "@/types/quiz";
import {
  buildGeneratePrompt,
  buildGradePrompt,
  GENERATE_SCHEMA,
  GRADE_SCHEMA,
} from "@/lib/prompts";

// 생성·채점 모두 동일 모델. 여기 한 곳에서 교체 가능.
const MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다");
  }
  return new GoogleGenAI({ apiKey });
}

type ParsedQuestion = Omit<Question, "id">;

/** 학습 자료로 문항을 생성한다. weakTags가 있으면 우선 출제된다. */
export async function generateQuestions(
  params: GenerateParams,
): Promise<Question[]> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: buildGeneratePrompt(params),
    config: {
      responseMimeType: "application/json",
      responseSchema: GENERATE_SCHEMA,
    },
  });

  const text = res.text;
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다");
  }

  const parsed = JSON.parse(text) as ParsedQuestion[];
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini 응답이 배열이 아닙니다");
  }

  return parsed.map((q) => ({ ...q, id: crypto.randomUUID() }));
}

/** 서술형 답안을 rubric 기반으로 채점한다. */
export async function gradeEssay(
  params: GradeEssayParams,
): Promise<EssayGrade> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: buildGradePrompt(params),
    config: {
      responseMimeType: "application/json",
      responseSchema: GRADE_SCHEMA,
    },
  });

  const text = res.text;
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다");
  }

  const parsed = JSON.parse(text) as EssayGrade;
  // 점수를 0~100으로 클램프한다.
  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  return { score, feedback: parsed.feedback ?? "" };
}
