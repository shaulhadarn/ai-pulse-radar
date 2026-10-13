import { describe, expect, it } from "vitest";
import { classify, isAiRelated } from "../taxonomy";

describe("classify", () => {
  it("tags techniques from a title", () => {
    expect(classify("Building an MCP server for RAG over your docs")).toEqual(expect.arrayContaining(["mcp-tools", "rag"]));
    expect(classify("Qwen3 GGUF quantized runs at 80 tokens/s on llama.cpp")).toEqual(
      expect.arrayContaining(["open-weights", "local-models", "inference"]),
    );
    expect(classify("GRPO fine-tuning with LoRA on a single GPU")).toContain("fine-tuning");
  });

  it("does not tag unrelated text", () => {
    expect(classify("Show HN: A tiny static site generator written in Zig")).toEqual([]);
  });

  it("is case-sensitive for acronyms that collide with common words", () => {
    expect(classify("A rag doll collection")).not.toContain("rag");
    expect(classify("Who says mcp is dead")).not.toContain("mcp-tools");
  });
});

describe("isAiRelated", () => {
  it("keeps AI stories and drops others", () => {
    expect(isAiRelated("OpenAI ships a new model")).toBe(true);
    expect(isAiRelated("LLMs are bad at arithmetic")).toBe(true);
    expect(isAiRelated("The history of the Boeing 747")).toBe(false);
  });
});

describe("builder techniques", () => {
  it("spots loops, goals, steering and orchestration", () => {
    expect(classify("I ran a Ralph loop overnight and it shipped the app")).toContain("agent-loops");
    expect(classify("Give agents goals and success criteria, not steps")).toContain("goal-agents");
    expect(classify("Activation steering with persona vectors")).toContain("steering");
    expect(classify("An orchestrator that spawns sub-agents in parallel")).toContain("orchestration");
    expect(classify("Packaging workflows as Agent Skills with SKILL.md")).toContain("agent-skills");
  });
});
