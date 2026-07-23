// Gemini 프롬프트와 responseSchema. 의존성: types (Architecture 레이어 3).
import { Type } from "@google/genai";
import type { GenerateParams, GradeEssayParams } from "@/types/quiz";

const TYPE_LABEL: Record<string, string> = {
  mc: "객관식",
  short: "단답형",
  essay: "서술형",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

/** 문제 생성 프롬프트 */
export function buildGeneratePrompt(params: GenerateParams): string {
  const typeLabels = params.types.map((t) => TYPE_LABEL[t]).join(", ");
  const difficulty = DIFFICULTY_LABEL[params.difficulty];

  const lines = [
    "너는 학습 자료로 퀴즈를 만드는 출제자다.",
    "아래 학습 자료를 바탕으로 문항을 생성하라.",
    "",
    `- 문항 수: ${params.count}개`,
    `- 유형: ${typeLabels} (요청한 유형만 사용하고, 여러 유형이면 고르게 섞어라)`,
    `- 난이도: ${difficulty}`,
    "- 각 문항에는 자료에서 도출한 주제 태그(tags)를 1개 이상 붙여라.",
    "- 객관식(mc)은 choices 배열과 정답 answer(보기 중 하나)를 포함하라.",
    "- 단답형(short)은 정답 문자열 answer를 포함하라.",
    "- 서술형(essay)은 채점 기준 rubric을 포함하라.",
    "- 모든 문항에 해설 explanation을 포함하라.",
  ];

  if (params.weakTags && params.weakTags.length > 0) {
    lines.push(
      "",
      `학습자가 약한 주제: ${params.weakTags.join(", ")}`,
      "위 약점 주제에 해당하는 문항을 다른 주제보다 우선하여 더 많이 출제하라.",
    );
  }

  lines.push("", "## 학습 자료", params.material);
  return lines.join("\n");
}

/** 문제 생성 responseSchema (JSON 강제) */
export const GENERATE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["mc", "short", "essay"] },
      prompt: { type: Type.STRING },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
      choices: { type: Type.ARRAY, items: { type: Type.STRING } },
      answer: { type: Type.STRING },
      explanation: { type: Type.STRING },
      rubric: { type: Type.STRING },
    },
    required: ["type", "prompt", "tags", "difficulty", "explanation"],
    propertyOrdering: ["type", "prompt", "tags", "difficulty", "choices", "answer", "explanation", "rubric"],
  },
};

/** 서술형 채점 프롬프트 */
export function buildGradePrompt(params: GradeEssayParams): string {
  const lines = [
    "너는 서술형 답안을 채점하는 채점자다.",
    "아래 문항과 채점 기준에 따라 학습자 답안을 0~100점으로 채점하고 피드백을 작성하라.",
    "",
    "## 문항",
    params.prompt,
  ];
  if (params.rubric) {
    lines.push("", "## 채점 기준", params.rubric);
  }
  lines.push(
    "",
    "## 학습자 답안",
    params.answer,
    "",
    "score는 0~100 사이 정수, feedback은 개선점을 담은 한국어 텍스트로 반환하라.",
  );
  return lines.join("\n");
}

/** 서술형 채점 responseSchema */
export const GRADE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    feedback: { type: Type.STRING },
  },
  required: ["score", "feedback"],
  propertyOrdering: ["score", "feedback"],
};
