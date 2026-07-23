"use client";

// /api/generate 호출 공통 로직. create-set.tsx와 weak-set-preview.tsx가 공유한다
// (독립 코드 리뷰에서 지적된 중복 제거). 의존성: types.
import { useCallback, useState } from "react";
import type { Difficulty, Question, QuestionType, QuizSet } from "@/types/quiz";

export interface GenerateSetParams {
  material: string;
  types: QuestionType[];
  difficulty: Difficulty;
  count: number;
  weakTags?: string[];
}

const FALLBACK_ERROR = "세트 생성에 실패했습니다";

export function useGenerateSet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (params: GenerateSetParams, materialId: string): Promise<QuizSet | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error ?? FALLBACK_ERROR);
          return null;
        }
        const questions = json.questions as Question[];
        return {
          id: crypto.randomUUID(),
          materialId,
          questions,
          createdAt: Date.now(),
        };
      } catch {
        setError(FALLBACK_ERROR);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, generate };
}
