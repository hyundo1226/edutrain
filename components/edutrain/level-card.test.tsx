import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelCard } from "@/components/edutrain/level-card";

describe("LevelCard", () => {
  it("[S6-1] levelScore=250 → 레벨 1이 표시된다", () => {
    render(<LevelCard levelScore={250} />);
    expect(screen.getByText(/레벨 1/)).toBeInTheDocument();
  });

  it("[S6-1] levelScore=500 → 레벨 2가 표시된다", () => {
    render(<LevelCard levelScore={500} />);
    expect(screen.getByText(/레벨 2/)).toBeInTheDocument();
  });

  it("[S6-2] levelScore=250 → 다음 레벨까지 진행률(250/500)이 표시된다", () => {
    render(<LevelCard levelScore={250} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("250 / 500")).toBeInTheDocument();
  });
});
