import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { loadAgent } from "./loadAgent";
import { resolveModel, type TaskType } from "../model-router";
import { AnthropicProvider } from "../providers/anthropic";
import { MockProvider } from "../providers/mock";
import type { ModelProvider } from "../providers/types";
import type { HandoffMetadata } from "./types";

export interface RunAgentInput {
  agentSlug: string;
  taskType: TaskType;
  projectId: string;
  /** The raw brief/context/prior artifacts this run is working from. */
  userInput: string;
  /** Path under /projects/{projectId}/ to write the resulting artifact to, e.g. "requirements/prd.md". */
  outputRelativePath: string;
  /** Inject a provider (used by tests to avoid a live network call). Defaults to the model router's choice. */
  provider?: ModelProvider;
}

export interface RunAgentResult {
  filePath: string;
  metadata: HandoffMetadata;
  rawResponse: string;
}

export function projectsRoot(): string {
  return process.env.PROJECTS_ROOT ?? path.join(process.cwd(), "..", "projects");
}

function buildSystemPrompt(role: string, body: string): string {
  return [
    `You are the ${role} agent in an AI-native software agency's multi-agent system.`,
    "",
    body,
    "",
    "## Output format — read carefully",
    "",
    "Respond with a single document in this exact shape: YAML frontmatter",
    "(delimited by --- lines) followed by a markdown body. The frontmatter",
    "must include these fields:",
    "",
    "  status: one of \"ready-for-handoff\", \"blocked-on-input\", \"in-progress\"",
    "  confidence: one of \"HIGH\", \"MEDIUM\", \"LOW\"",
    "  assumptions: a YAML list of strings (empty list if none)",
    "  risks: a YAML list of strings (empty list if none)",
    "  open_questions: a YAML list of strings (empty list if none)",
    "  review_required: true or false",
    "",
    "Set confidence honestly — LOW confidence with real open_questions is a",
    "correct and expected output, not a failure. Do not invent information",
    "that was not given to you or clearly implied by it; put genuine gaps in",
    "open_questions instead of guessing.",
    "",
    "Everything after the closing --- is the actual deliverable content, in markdown.",
  ].join("\n");
}

function buildUserPrompt(input: RunAgentInput): string {
  return [
    `Project: ${input.projectId}`,
    `Task type: ${input.taskType}`,
    "",
    "Input:",
    input.userInput,
  ].join("\n");
}

function parseAgentResponse(
  raw: string,
  input: RunAgentInput,
  agentSlug: string
): { metadata: HandoffMetadata; body: string } {
  const parsed = matter(raw);
  const data = parsed.data as Partial<HandoffMetadata>;

  const metadata: HandoffMetadata = {
    project: input.projectId,
    task: data.task,
    agent: agentSlug,
    // Absent or unparseable structure defaults to the safe end: low
    // confidence, review required. An agent's output is never silently
    // trusted just because it parsed.
    status: data.status ?? "in-progress",
    confidence: data.confidence ?? "LOW",
    assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
    inputs: Array.isArray(data.inputs) ? data.inputs : [`${input.userInput.slice(0, 120)}${input.userInput.length > 120 ? "..." : ""}`],
    outputs: Array.isArray(data.outputs) ? data.outputs : [input.outputRelativePath],
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
    risks: Array.isArray(data.risks) ? data.risks : [],
    open_questions: Array.isArray(data.open_questions) ? data.open_questions : [],
    next_agent: data.next_agent,
    review_required: data.review_required ?? true,
  };

  return { metadata, body: parsed.content.trim() };
}

/**
 * Load an agent definition, run it against structured input through the
 * model router, and write the resulting artifact (with handoff metadata
 * frontmatter) into /projects/{projectId}/{outputRelativePath}.
 *
 * This never overwrites an existing artifact in place — see writeArtifact.
 */
export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const agent = loadAgent(input.agentSlug);
  const modelConfig = resolveModel(input.taskType);
  const provider =
    input.provider ??
    (modelConfig.provider === "anthropic" ? new AnthropicProvider() : new MockProvider());

  const completion = await provider.complete({
    systemPrompt: buildSystemPrompt(agent.role, agent.body),
    userPrompt: buildUserPrompt(input),
    model: modelConfig.model,
    maxTokens: modelConfig.maxTokens,
  });

  const { metadata, body } = parseAgentResponse(completion.text, input, agent.slug);
  const filePath = writeArtifact(input.projectId, input.outputRelativePath, metadata, body);

  return { filePath, metadata, rawResponse: completion.text };
}

/**
 * Never silently overwrite important decisions (Section 39 / 3): if the
 * target path already exists, write a new numbered version instead and
 * leave the existing file untouched.
 */
function writeArtifact(
  projectId: string,
  relativePath: string,
  metadata: HandoffMetadata,
  body: string
): string {
  const dir = path.join(projectsRoot(), projectId, path.dirname(relativePath));
  fs.mkdirSync(dir, { recursive: true });

  let target = path.join(projectsRoot(), projectId, relativePath);
  if (fs.existsSync(target)) {
    const ext = path.extname(relativePath);
    const base = relativePath.slice(0, -ext.length);
    let version = 2;
    while (fs.existsSync(path.join(projectsRoot(), projectId, `${base}-v${version}${ext}`))) {
      version += 1;
    }
    target = path.join(projectsRoot(), projectId, `${base}-v${version}${ext}`);
  }

  fs.writeFileSync(target, matter.stringify(body, stripUndefined(metadata)));
  return target;
}

/** js-yaml (used by gray-matter.stringify) can't dump literal `undefined` values — drop them so optional fields are simply absent from the frontmatter instead. */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
