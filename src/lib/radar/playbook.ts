import type { TechniqueId } from "./types";

export interface Play {
  /** One line on what the technique is. */
  what: string;
  /** How a builder can use it in their next app. */
  apply: string;
}

/** Plain-language notes shown next to each trend on the Insights page. */
export const PLAYBOOK: Record<TechniqueId, Play> = {
  agents: {
    what: "Models that plan, call tools and act on their own instead of answering one prompt.",
    apply: "Wrap one repetitive workflow in your app as an agent with 3-5 well-described tools before building anything general.",
  },
  "agent-loops": {
    what: "Running an agent in a loop (try, check, fix, repeat) until a test, eval or checker passes.",
    apply: "Give the loop a hard exit condition such as tests passing or a score threshold, plus a budget cap, and log every iteration.",
  },
  "goal-agents": {
    what: "Handing an agent an outcome and success criteria instead of step-by-step instructions.",
    apply: "Write the goal, the definition of done and a short rubric up front, then let the agent choose the steps and grade itself against the rubric.",
  },
  steering: {
    what: "Controlling model behaviour directly, from activation and feature steering to system-level guardrails.",
    apply: "For products, steer with system prompts, rubrics and structured outputs first; reach for activation steering only on open-weight models you host.",
  },
  orchestration: {
    what: "An orchestrator agent that splits work across sub-agents running in parallel.",
    apply: "Use sub-agents for reading-heavy or parallel work (research, per-file changes) and keep the orchestrator's context small.",
  },
  "agent-skills": {
    what: "Packaged instructions, scripts and resources an agent loads only when a task needs them.",
    apply: "Turn your team's repeat procedures (deploys, reviews, report formats) into skills so every agent run follows them.",
  },
  memory: {
    what: "State that survives across sessions: memory files, stores and knowledge graphs.",
    apply: "Start with a plain project memory file the agent reads and updates; add a vector or graph store only when it outgrows that.",
  },
  "computer-use": {
    what: "Agents that click, type and read screens in browsers, desktops and phones.",
    apply: "Use it for systems with no API, behind strict allow-lists and a human approval step for anything that spends money or sends messages.",
  },
  "spec-driven": {
    what: "Writing the spec, plan and tests first so coding agents build against a clear target.",
    apply: "Have the agent draft a spec and test list in plan mode, review it, then let it implement until the tests pass.",
  },
  "mcp-tools": {
    what: "Model Context Protocol and function calling: a standard way to plug tools and data into any model.",
    apply: "Expose your app's core actions as an MCP server so Claude, ChatGPT and IDE agents can all drive it.",
  },
  "coding-agents": {
    what: "Agentic coding tools like Claude Code, Codex and Cursor that write and ship whole features.",
    apply: "Pair a coding agent with a strong test suite and CI; it is only as good as the feedback it can check itself against.",
  },
  rag: {
    what: "Retrieving relevant documents at query time and feeding them to the model.",
    apply: "Combine keyword and vector search, rerank the results, and cite sources in the answer.",
  },
  "context-engineering": {
    what: "Deciding exactly what goes into the model's context: prompts, examples, files, history and memory.",
    apply: "Keep a stable cached system prompt, put volatile data last, and prune old tool output instead of letting context grow.",
  },
  reasoning: {
    what: "Models that think before answering, trading time and tokens for accuracy.",
    apply: "Use adaptive thinking and tune effort per route: low for chat, high for planning, coding and analysis.",
  },
  "fine-tuning": {
    what: "Adapting models with LoRA, RL or distillation on your own data.",
    apply: "Exhaust prompting, retrieval and evals first; fine-tune when you have a stable task and thousands of graded examples.",
  },
  inference: {
    what: "Serving models faster and cheaper: quantization, batching, caching and speculative decoding.",
    apply: "Turn on prompt caching and batch non-urgent jobs before optimising hardware; they are the cheapest wins.",
  },
  "local-models": {
    what: "Running models on your own machine or device with llama.cpp, Ollama or MLX.",
    apply: "Use local models for private or offline features and for high-volume simple tasks; route hard tasks to a frontier model.",
  },
  "open-weights": {
    what: "Releases you can download and host yourself, like Qwen, DeepSeek, Llama and Gemma.",
    apply: "Benchmark the newest open model on your own eval set before switching; leaderboard wins rarely transfer one to one.",
  },
  "frontier-models": {
    what: "New models and features from Anthropic, OpenAI, Google and the other major labs.",
    apply: "Re-run your evals on each release and adopt new API features (caching, structured outputs, tool search) that cut cost.",
  },
  multimodal: {
    what: "Models that see, hear, speak and generate images or video.",
    apply: "Add vision to document and screenshot workflows first; it is the most mature multimodal capability.",
  },
  evals: {
    what: "Benchmarks and test sets that measure whether a model or prompt change helped.",
    apply: "Build a small eval from real user requests before you tune anything, and run it on every prompt or model change.",
  },
  safety: {
    what: "Alignment, interpretability, jailbreaks and prompt injection.",
    apply: "Treat every tool result and fetched page as untrusted input, and gate irreversible agent actions behind a human.",
  },
};
