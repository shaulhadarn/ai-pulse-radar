import type { TechniqueId } from "./types";

export interface Technique {
  id: TechniqueId;
  label: string;
  description: string;
  patterns: RegExp[];
}

/**
 * The techniques the radar tracks. Order matters only for display ties.
 * Patterns are matched case-insensitively against title + summary.
 */
export const TECHNIQUES: Technique[] = [
  {
    id: "agents",
    label: "Agents",
    description: "Autonomous and multi-agent systems, planning, tool loops",
    patterns: [/\bagent(s|ic)?\b/i, /\bmulti-agent\b/i, /\bcomputer[- ]use\b/i, /\bbrowser[- ]use\b/i, /\bautonomous\b/i],
  },
  {
    id: "mcp-tools",
    label: "MCP & tool use",
    description: "Model Context Protocol, function calling, tool integrations",
    patterns: [/\bMCP\b/, /\bmodel context protocol\b/i, /\bfunction[- ]calling\b/i, /\btool[- ]use\b/i, /\btool[- ]calling\b/i, /\bA2A\b/],
  },
  {
    id: "coding-agents",
    label: "AI coding",
    description: "Coding assistants and agentic software engineering",
    patterns: [/\bclaude code\b/i, /\bcursor\b/i, /\bcodex\b/i, /\bcopilot\b/i, /\bvibe[- ]coding\b/i, /\bSWE-bench\b/i, /\bcoding (agent|assistant|model)s?\b/i, /\baider\b/i],
  },
  {
    id: "rag",
    label: "RAG & retrieval",
    description: "Retrieval-augmented generation, embeddings, vector search",
    patterns: [/\bRAG\b/, /\bretrieval[- ]augmented\b/i, /\bembeddings?\b/i, /\bvector (db|database|search|store)\b/i, /\brerank(er|ing)?\b/i, /\bGraphRAG\b/i],
  },
  {
    id: "context-engineering",
    label: "Prompt & context engineering",
    description: "Prompting, long context, memory, structured outputs",
    patterns: [/\bprompt(ing| engineering)\b/i, /\bcontext (engineering|window)\b/i, /\blong[- ]context\b/i, /\bstructured outputs?\b/i, /\bsystem prompt\b/i, /\bprompt caching\b/i, /\bagent memory\b/i],
  },
  {
    id: "reasoning",
    label: "Reasoning",
    description: "Reasoning models, chain of thought, test-time compute",
    patterns: [/\breasoning\b/i, /\bchain[- ]of[- ]thought\b/i, /\bCoT\b/, /\btest[- ]time (compute|scaling)\b/i, /\bthinking (model|mode|budget)\b/i],
  },
  {
    id: "fine-tuning",
    label: "Fine-tuning & RL",
    description: "LoRA, RLHF, DPO, GRPO, distillation, synthetic data",
    patterns: [/\bfine[- ]?tun(e|ed|ing)\b/i, /\bLoRA\b/i, /\bQLoRA\b/i, /\bRLHF\b/i, /\bRLVR\b/i, /\bDPO\b/, /\bGRPO\b/, /\bdistill(ation|ed)?\b/i, /\bsynthetic data\b/i, /\breinforcement learning\b/i],
  },
  {
    id: "inference",
    label: "Inference & efficiency",
    description: "Quantization, serving, speculative decoding, kernels",
    patterns: [/\bquantiz(ation|ed|e)\b/i, /\bvLLM\b/i, /\bSGLang\b/i, /\bspeculative decoding\b/i, /\bKV[- ]cache\b/i, /\bflash ?attention\b/i, /\binference\b/i, /\btokens?\/s(ec)?\b/i, /\bMoE\b/, /\bmixture[- ]of[- ]experts\b/i],
  },
  {
    id: "local-models",
    label: "Local & on-device",
    description: "Running models locally, llama.cpp, GGUF, small models",
    patterns: [/\bllama\.cpp\b/i, /\bGGUF\b/i, /\bollama\b/i, /\bMLX\b/, /\bLM Studio\b/i, /\bon[- ]device\b/i, /\blocal(ly)? (llm|model|inference)s?\b/i, /\bsmall language models?\b/i],
  },
  {
    id: "open-weights",
    label: "Open-weight models",
    description: "Llama, Qwen, DeepSeek, Mistral, Gemma and other open releases",
    patterns: [/\bopen[- ](weights?|source model)s?\b/i, /\bllama ?\d/i, /\bqwen/i, /\bdeepseek/i, /\bmistral\b/i, /\bgemma\b/i, /\bkimi\b/i, /\bGLM-?\d/i, /\bphi-?\d/i, /\bhugging ?face\b/i],
  },
  {
    id: "frontier-models",
    label: "Frontier models",
    description: "Releases and updates from the major labs",
    patterns: [/\bclaude\b/i, /\banthropic\b/i, /\bGPT-?\d/i, /\bopenai\b/i, /\bgemini\b/i, /\bgrok\b/i, /\bo\d(-mini|-pro)?\b/],
  },
  {
    id: "multimodal",
    label: "Multimodal",
    description: "Vision, voice, image and video generation",
    patterns: [/\bmultimodal\b/i, /\bvision[- ]language\b/i, /\bVLM\b/, /\btext[- ]to[- ](speech|image|video)\b/i, /\bTTS\b/, /\bspeech\b/i, /\bvoice\b/i, /\bdiffusion\b/i, /\bvideo (generation|model)\b/i, /\bimage generation\b/i],
  },
  {
    id: "evals",
    label: "Evals & benchmarks",
    description: "Benchmarks, leaderboards, evaluation methods",
    patterns: [/\bevals?\b/i, /\bbenchmarks?\b/i, /\bleaderboard\b/i, /\bLLM[- ]as[- ]a[- ]judge\b/i, /\bARC-AGI\b/i, /\bhumanity'?s last exam\b/i],
  },
  {
    id: "safety",
    label: "Safety & interpretability",
    description: "Alignment, interpretability, jailbreaks, prompt injection",
    patterns: [/\balignment\b/i, /\binterpretability\b/i, /\bjailbreak/i, /\bprompt injection\b/i, /\bred[- ]team/i, /\bAI safety\b/i, /\bsparse autoencoders?\b/i],
  },
];

const TECHNIQUE_LABELS = new Map(TECHNIQUES.map((t) => [t.id, t.label]));

export function techniqueLabel(id: TechniqueId): string {
  return TECHNIQUE_LABELS.get(id) ?? id;
}

/** Broad AI signal, used to drop off-topic items from general sources like Hacker News. */
const AI_SIGNAL = /\b(AI|A\.I\.|LLMs?|GPT|machine learning|ML|deep learning|neural|transformer|language models?|chatbot|generative|diffusion|inference|model weights)\b/i;

export function classify(text: string): TechniqueId[] {
  return TECHNIQUES.filter((t) => t.patterns.some((p) => p.test(text))).map((t) => t.id);
}

export function isAiRelated(text: string): boolean {
  return AI_SIGNAL.test(text) || classify(text).length > 0;
}
