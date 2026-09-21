/**
 * SQLite has no native enum type, so schema.prisma stores these as plain
 * String columns. This file is the actual source of truth for allowed
 * values at the application layer — every write path should go through
 * these, not raw strings.
 */

export const PROJECT_STAGES = [
  "LEAD",
  "DISCOVERY",
  "REQUIREMENTS",
  "ESTIMATION",
  "PROPOSAL",
  "APPROVED",
  "PLANNING",
  "DESIGN",
  "ARCHITECTURE",
  "IMPLEMENTATION",
  "QA",
  "SECURITY_REVIEW",
  "DEPLOYMENT",
  "MONITORING",
  "MAINTENANCE",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const TASK_STATUSES = [
  "BACKLOG",
  "READY",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "APPROVED",
  "DONE",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const AGENT_STATUSES = ["ACTIVE", "DRAFT", "DISABLED"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

// Matches the six Quality Gates in /docs/architecture-plan.md Section H
// exactly (Requirements, Design, Architecture, Implementation, QA,
// Production) — an earlier version of this list had 5 values
// (IMPLEMENTATION_PLAN/DEPLOYMENT instead of IMPLEMENTATION/QA/PRODUCTION)
// that didn't line up with Section H. Fixed in Phase 6, which needed the
// two to actually match to write gate-enforcement code.
export const APPROVAL_GATES = [
  "REQUIREMENTS",
  "DESIGN",
  "ARCHITECTURE",
  "IMPLEMENTATION",
  "QA",
  "PRODUCTION",
] as const;
export type ApprovalGate = (typeof APPROVAL_GATES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const KNOWLEDGE_SCOPES = ["GLOBAL", "PROJECT", "AGENT"] as const;
export type KnowledgeScope = (typeof KNOWLEDGE_SCOPES)[number];

export const DEPLOYMENT_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "SUCCEEDED",
  "FAILED",
  "ROLLED_BACK",
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];
