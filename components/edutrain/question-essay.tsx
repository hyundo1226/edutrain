"use client";

// 서술형 답안 입력 + 제출 + 로딩 + Gemini 채점 결과(점수·피드백) + 에러.
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { AnswerResult, Question } from "@/types/quiz";

// S4-3 임계값(80%)과 일관되게, 약점 태그 판단용 correct 경계로 재사용한다.
const ESSAY_CORRECT_THRESHOLD = 80;

export interface QuestionEssayProps {
  question: Question;
  /** 채점 성공 직후 호출 (세션 결과 기록용) */
  onGraded: (result: AnswerResult) => void;
  /** "다음 문항 →" / "결과 보기 →" 클릭 시 호출 */
  onNext: () => void;
  nextLabel?: string;
}

export function QuestionEssay({
  question,
  onGraded,
  onNext,
  nextLabel = "다음 문항 →",
}: QuestionEssayProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<{ score: number; feedback: string } | null>(
    null,
  );

  async function handleSubmit() {
    if (answer.trim().length === 0) {
      setError("답안을 입력하세요");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question.prompt,
          rubric: question.rubric,
          answer,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "채점에 실패했습니다");
        return;
      }
      const score = json.score as number;
      const feedback = json.feedback as string;
      setGrade({ score, feedback });
      onGraded({
        questionId: question.id,
        given: answer,
        correct: score >= ESSAY_CORRECT_THRESHOLD,
        score,
        feedback,
      });
    } catch {
      setError("채점에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const locked = grade !== null;

  return (
    <div>
      <div className="mb-3 font-bold">{question.prompt}</div>

      <Textarea
        aria-label="답안"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={locked || submitting}
        placeholder="답안을 입력하세요…"
        className="mb-1 min-h-24"
      />
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {!error && <div className="mb-4" />}

      {!locked && (
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "채점 중…" : error ? "다시 채점" : "제출"}
        </Button>
      )}

      {locked && grade && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">채점 결과</span>
              <span className="text-2xl font-bold">{grade.score} / 100</span>
            </div>
            <div className="text-xs font-bold mb-1">피드백</div>
            <div className="text-sm">{grade.feedback}</div>
          </div>
          <Button className="w-full" onClick={onNext}>
            {nextLabel}
          </Button>
        </>
      )}
    </div>
  );
}
