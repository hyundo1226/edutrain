"use client";

// 자료 입력 & 세트 생성 화면. shadcn 컴포넌트를 조합만 한다 (ui/* 직접 수정 금지).
import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addMaterial } from "@/lib/storage";
import { useGenerateSet } from "@/hooks/use-generate-set";
import type { Difficulty, Material, QuestionType, QuizSet } from "@/types/quiz";

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "mc", label: "객관식" },
  { value: "short", label: "단답형" },
  { value: "essay", label: "서술형" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "쉬움" },
  { value: "medium", label: "보통" },
  { value: "hard", label: "어려움" },
];

function deriveTitle(content: string): string {
  const firstLine = content.trim().split("\n")[0] ?? "";
  return firstLine.slice(0, 30) || "학습자료";
}

export interface CreateSetProps {
  /** 약점만 다시 풀기 등에서 우선 출제할 태그 (S6-1) */
  weakTags?: string[];
  /** 홈에서 저장 자료를 선택해 진입한 경우 (S5-4) — 자료 입력 영역에 미리 채워진다 */
  existingMaterial?: Material;
  onGenerated: (material: Material, quizSet: QuizSet) => void;
}

export function CreateSet({
  weakTags,
  existingMaterial,
  onGenerated,
}: CreateSetProps) {
  const [material, setMaterial] = useState(existingMaterial?.content ?? "");
  const [types, setTypes] = useState<QuestionType[]>(["mc", "essay"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(5);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loading, error, generate } = useGenerateSet();
  const displayError = validationError ?? error;

  function toggleType(type: QuestionType, checked: boolean) {
    setTypes((prev) => {
      if (checked) return prev.includes(type) ? prev : [...prev, type];
      return prev.filter((t) => t !== type);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMaterial(text);
  }

  async function handleSubmit() {
    if (material.trim().length === 0) {
      setValidationError("학습자료를 입력하세요");
      return;
    }
    setValidationError(null);

    // 기존 저장 자료를 그대로 다시 쓰는 경우(내용 미수정) 새 자료로 중복 저장하지 않는다.
    // 앞뒤 공백 차이(재붙여넣기 등)까지는 같은 자료로 취급한다.
    const reuseExisting =
      existingMaterial !== undefined &&
      existingMaterial.content.trim() === material.trim();
    const materialRecord: Material = reuseExisting
      ? existingMaterial
      : {
          id: crypto.randomUUID(),
          title: deriveTitle(material),
          content: material,
          createdAt: Date.now(),
        };

    const quizSet = await generate(
      { material, types, difficulty, count, weakTags },
      materialRecord.id,
    );
    if (!quizSet) return;

    if (!reuseExisting) addMaterial(materialRecord);
    onGenerated(materialRecord, quizSet);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-lg font-bold mb-5">자료 입력 & 세트 생성</h2>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="material">학습자료</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            .txt / .md 업로드
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            aria-label="학습자료 파일 업로드"
            onChange={handleFileChange}
          />
        </div>
        <Textarea
          id="material"
          aria-label="학습자료"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="여기에 학습자료 텍스트를 붙여넣기…"
          className="min-h-32"
        />
        {displayError && (
          <p className="mt-1 text-sm text-destructive">{displayError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
        <div>
          <div className="text-sm font-bold mb-1">문제 유형</div>
          {TYPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 mb-1">
              <Checkbox
                checked={types.includes(opt.value)}
                onCheckedChange={(checked) =>
                  toggleType(opt.value, checked === true)
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div>
          <div className="text-sm font-bold mb-1">난이도</div>
          <RadioGroup
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty)}
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 mb-1">
                <RadioGroupItem value={opt.value} />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
        </div>
        <div>
          <div className="text-sm font-bold mb-1">문항 수</div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="문항 수 줄이기"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
            >
              −
            </Button>
            <span className="font-bold w-6 text-center">{count}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="문항 수 늘리기"
              onClick={() => setCount((c) => Math.min(20, c + 1))}
            >
              +
            </Button>
          </div>
        </div>
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={loading}>
        {loading ? "생성 중…" : displayError ? "다시 시도" : "세트 생성"}
      </Button>
    </div>
  );
}
