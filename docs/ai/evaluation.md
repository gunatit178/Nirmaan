# Evaluation

**IMPLEMENTED:** `src/lib/evaluation/`: 7 eval cases (planted SQL injection,
hardcoded secret, off-by-one, single point of failure, fabricated stats,
proceed-vs-flag judgement). Each checker is proven to tell good output from
bad with fixtures. Discovery parsing has strict tests (rejects prose, bad
JSON, unknown kinds, empties).

**PLANNED:**

- Discovery eval set: 10 real (anonymized) leads with a human-written ideal
  split of facts, assumptions, questions and recommendations; score recall of
  questions and the rate of assumptions mislabelled as facts.
- Run evals on model or prompt changes before switching defaults.
- Track, per agent, the acceptance rate of its output (items confirmed versus
  rejected by humans), which is available from `DiscoveryItem` statuses today.
