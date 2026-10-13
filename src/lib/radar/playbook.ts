import type { TechniqueId } from "./types";

export interface Play {
  /** One line on what the technique is. */
  what: string;
  /** How a builder can use it in their next app. */
  apply: string;
  /** A product someone could sell built on it. */
  opportunity: string;
}

/** Plain-language notes shown next to each trend on the Insights page. */
export const PLAYBOOK: Record<TechniqueId, Play> = {
  agents: {
    what: "Models that plan, call tools and act on their own instead of answering one prompt.",
    apply: "Wrap one repetitive workflow in your app as an agent with 3-5 well-described tools before building anything general.",
    opportunity: "Vertical agents that run one back-office workflow end to end (invoicing, lead qualification, support triage) sold per seat or per task.",
  },
  "agent-loops": {
    what: "Running an agent in a loop (try, check, fix, repeat) until a test, eval or checker passes.",
    apply: "Give the loop a hard exit condition such as tests passing or a score threshold, plus a budget cap, and log every iteration.",
    opportunity: 'A hosted "run until it passes" service that loops an agent against a customer\'s tests or rubric and bills per successful run.',
  },
  "goal-agents": {
    what: "Handing an agent an outcome and success criteria instead of step-by-step instructions.",
    apply: "Write the goal, the definition of done and a short rubric up front, then let the agent choose the steps and grade itself against the rubric.",
    opportunity: "Outcome-priced automation: customers state the goal and success criteria, and pay only when the agent meets them.",
  },
  steering: {
    what: "Controlling model behaviour directly, from activation and feature steering to system-level guardrails.",
    apply: "For products, steer with system prompts, rubrics and structured outputs first; reach for activation steering only on open-weight models you host.",
    opportunity: "Brand and policy guardrails as a service: tone, compliance and safety controls that businesses drop in front of any model.",
  },
  orchestration: {
    what: "An orchestrator agent that splits work across sub-agents running in parallel.",
    apply: "Use sub-agents for reading-heavy or parallel work (research, per-file changes) and keep the orchestrator's context small.",
    opportunity: "Research and due-diligence products that fan out across many sources in parallel and return one cited report.",
  },
  "agent-skills": {
    what: "Packaged instructions, scripts and resources an agent loads only when a task needs them.",
    apply: "Turn your team's repeat procedures (deploys, reviews, report formats) into skills so every agent run follows them.",
    opportunity: "A paid library of industry skills (legal review, real estate listings, e-commerce ops) that plug into Claude and other agents.",
  },
  memory: {
    what: "State that survives across sessions: memory files, stores and knowledge graphs.",
    apply: "Start with a plain project memory file the agent reads and updates; add a vector or graph store only when it outgrows that.",
    opportunity: "Company memory for agents: a managed knowledge layer that remembers customers, decisions and docs across every AI tool a team uses.",
  },
  "computer-use": {
    what: "Agents that click, type and read screens in browsers, desktops and phones.",
    apply: "Use it for systems with no API, behind strict allow-lists and a human approval step for anything that spends money or sends messages.",
    opportunity: "Automation for legacy portals with no API, like insurance, government and supplier sites, priced per completed task.",
  },
  "spec-driven": {
    what: "Writing the spec, plan and tests first so coding agents build against a clear target.",
    apply: "Have the agent draft a spec and test list in plan mode, review it, then let it implement until the tests pass.",
    opportunity: "Spec-to-app services for small businesses: turn a one-page brief into a tested, deployed internal tool.",
  },
  "mcp-tools": {
    what: "Model Context Protocol and function calling: a standard way to plug tools and data into any model.",
    apply: "Expose your app's core actions as an MCP server so Claude, ChatGPT and IDE agents can all drive it.",
    opportunity: "MCP servers for popular SaaS and niche industry systems, sold as a subscription so any agent can operate them.",
  },
  "coding-agents": {
    what: "Agentic coding tools like Claude Code, Codex and Cursor that write and ship whole features.",
    apply: "Pair a coding agent with a strong test suite and CI; it is only as good as the feedback it can check itself against.",
    opportunity: "Done-for-you app builds and maintenance retainers powered by coding agents, at a fraction of agency prices.",
  },
  rag: {
    what: "Retrieving relevant documents at query time and feeding them to the model.",
    apply: "Combine keyword and vector search, rerank the results, and cite sources in the answer.",
    opportunity: "Private document assistants for firms with large archives (law, accounting, engineering) with cited answers and access controls.",
  },
  "context-engineering": {
    what: "Deciding exactly what goes into the model's context: prompts, examples, files, history and memory.",
    apply: "Keep a stable cached system prompt, put volatile data last, and prune old tool output instead of letting context grow.",
    opportunity: "Prompt and context audits that cut a company's LLM bill and raise answer quality, sold as a fixed-fee service.",
  },
  reasoning: {
    what: "Models that think before answering, trading time and tokens for accuracy.",
    apply: "Use adaptive thinking and tune effort per route: low for chat, high for planning, coding and analysis.",
    opportunity: "Analyst-grade copilots for decisions that need careful thinking: pricing, underwriting, contract risk.",
  },
  "fine-tuning": {
    what: "Adapting models with LoRA, RL or distillation on your own data.",
    apply: "Exhaust prompting, retrieval and evals first; fine-tune when you have a stable task and thousands of graded examples.",
    opportunity: "Custom small models for one task (classification, extraction) that run cheaper and faster than frontier APIs.",
  },
  inference: {
    what: "Serving models faster and cheaper: quantization, batching, caching and speculative decoding.",
    apply: "Turn on prompt caching and batch non-urgent jobs before optimising hardware; they are the cheapest wins.",
    opportunity: "Cost optimisation for AI-heavy startups: caching, batching and routing that pays for itself from the savings.",
  },
  "local-models": {
    what: "Running models on your own machine or device with llama.cpp, Ollama or MLX.",
    apply: "Use local models for private or offline features and for high-volume simple tasks; route hard tasks to a frontier model.",
    opportunity: "Offline, private AI appliances and apps for clinics, law firms and anyone who cannot send data to the cloud.",
  },
  "open-weights": {
    what: "Releases you can download and host yourself, like Qwen, DeepSeek, Llama and Gemma.",
    apply: "Benchmark the newest open model on your own eval set before switching; leaderboard wins rarely transfer one to one.",
    opportunity: "Hosted fine-tunes of open models for industries that need data residency or predictable per-token cost.",
  },
  "frontier-models": {
    what: "New models and features from Anthropic, OpenAI, Google and the other major labs.",
    apply: "Re-run your evals on each release and adopt new API features (caching, structured outputs, tool search) that cut cost.",
    opportunity: "Fast-follow products: ship a polished app on each new model capability within days of release.",
  },
  multimodal: {
    what: "Models that see, hear, speak and generate images or video.",
    apply: "Add vision to document and screenshot workflows first; it is the most mature multimodal capability.",
    opportunity: "Vision workflows that read invoices, receipts, floor plans or product photos and turn them into structured data.",
  },
  evals: {
    what: "Benchmarks and test sets that measure whether a model or prompt change helped.",
    apply: "Build a small eval from real user requests before you tune anything, and run it on every prompt or model change.",
    opportunity: "Eval-as-a-service: build and run test suites so companies know when a model or prompt change breaks their product.",
  },
  safety: {
    what: "Alignment, interpretability, jailbreaks and prompt injection.",
    apply: "Treat every tool result and fetched page as untrusted input, and gate irreversible agent actions behind a human.",
    opportunity: "Prompt-injection and agent-permission audits for companies putting agents in front of customers or money.",
  },
};
