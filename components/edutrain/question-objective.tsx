"use client";

// 객관식·단답 입력 + 제출 + 즉시 채점 결과 + 다음 문항 이동.
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { gradeObjective } from "@/lib/grading";
import type { AnswerResult, Question } from "@/types/quiz";

export interface QuestionObjectiveProps {
  question: Question;
  /** 채점 즉시 호출 (세션 결과 기록용) */
  onGraded: (result: AnswerResult) => void;
  /** "다음 문항 →" / "결과 보기 →" 클릭 시 호출 */
  onNext: () => void;
  nextLabel?: string;
}

export function QuestionObjective({
  question,
  onGraded,
  onNext,
  nextLabel = "다음 문항 →",
}: QuestionObjectiveProps) {
  const [given, setGiven] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const locked = result !== null;

  function handleSubmit() {
    const r = gradeObjective(question, given);
    setResult(r);
    onGraded(r);
  }

  return (
    <div>
      <div className="mb-4 font-bold">{question.prompt}</div>

      {question.type === "mc" ? (
        <RadioGroup
          value={given}
          onValueChange={setGiven}
          disabled={locked}
          className="mb-4"
        >
          {question.choices?.map((choice) => {
            const isAnswerChoice = choice === question.answer;
            const isGivenChoice = choice === given;
            return (
              <label key={choice} className="flex items-center gap-2">
                <RadioGroupItem value={choice} />
                <span>{choice}</span>
                {locked && isAnswerChoice && <span className="text-xs">✓ 정답</span>}
                {locked && isGivenChoice && !isAnswerChoice && (
                  <span className="text-xs">✗ 내 선택</span>
                )}
              </label>
            );
          })}
        </RadioGroup>
      ) : (
        <Input
          aria-label="답안"
          value={given}
          onChange={(e) => setGiven(e.target.value)}
          disabled={locked}
          className="mb-4"
        />
      )}

      {!locked && (
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={given.trim().length === 0}
        >
          제출
        </Button>
      )}

      {locked && result && (
        <>
          <div className="mb-4">
            <p className="font-bold mb-1">{result.correct ? "정답" : "오답"}</p>
            {!result.correct && question.type === "mc" && (
              <p className="text-sm mb-1">정답: {question.answer}</p>
            )}
            {question.explanation && (
              <div className="text-sm">
                <div className="text-xs font-bold mb-1">해설</div>
                {question.explanation}
              </div>
            )}
          </div>
          <Button className="w-full" onClick={onNext}>
            {nextLabel}
          </Button>
        </>
      )}
    </div>
  );
}
