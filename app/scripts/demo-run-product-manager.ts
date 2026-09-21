/**
 * Live end-to-end demo: runs the Product Manager agent against a sample
 * client brief using the REAL Anthropic provider and writes an actual PRD
 * to /projects/demo-project/requirements/prd.md.
 *
 * Requires ANTHROPIC_API_KEY to be set (e.g. in app/.env.local). Without
 * it, this fails loudly rather than pretending to succeed — see
 * src/lib/providers/anthropic.ts.
 *
 * Usage:  npm run demo:pm
 */
import { runAgent } from "../src/lib/agents/runAgent";

const SAMPLE_BRIEF = `
Client: a three-person local bakery ("Riverside Bread Co.") that currently
has no website at all — just an Instagram account. They want customers to
be able to see the weekly menu, find their hours/location, and place
advance orders for custom cakes. They mentioned "something like Squarespace
but nicer" and have a budget in mind but didn't state a number yet. They
want it live before their one-year anniversary event.
`.trim();

async function main() {
  console.log("Running Product Manager agent against a sample client brief...\n");

  const result = await runAgent({
    agentSlug: "product-manager",
    taskType: "requirements",
    projectId: "demo-project",
    userInput: SAMPLE_BRIEF,
    outputRelativePath: "requirements/prd.md",
  });

  console.log(`Wrote artifact to: ${result.filePath}`);
  console.log(`status: ${result.metadata.status}`);
  console.log(`confidence: ${result.metadata.confidence}`);
  console.log(`review_required: ${result.metadata.review_required}`);
  if (result.metadata.open_questions.length > 0) {
    console.log(`open_questions:`);
    for (const q of result.metadata.open_questions) console.log(`  - ${q}`);
  }
}

main().catch((err) => {
  console.error("Demo run failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
