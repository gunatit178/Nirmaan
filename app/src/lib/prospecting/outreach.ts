import { prisma } from "../db/client";
import { audit } from "../audit";
import { assertCan } from "../auth/permissions";
import type { Actor } from "../auth/actor";
import { callModel } from "../ai/callModel";
import { extractJsonObject, text } from "../ai/json";
import { decodeStringList } from "../db/json";
import { isOneOf, OUTREACH_CHANNELS, type OutreachChannel } from "../db/enums";
import type { ModelProvider } from "../providers/types";
import { normalEmail, normalPhone, packageName } from "./basics";
import { dailyLimit, mailerFromEnv, type Mailer } from "./mailer";
import { isSuppressed } from "./service";

/**
 * Prospecting, step 3: the first message. Claude drafts it; a person reads,
 * edits and approves the exact words. Email is sent by the OS only on that
 * approval; WhatsApp is opened pre-filled for the person to send themselves.
 *
 * Guard rails, all enforced here rather than in the UI: the do-not-contact
 * list, one message per business per week, a daily cap on emails, and an
 * opt-out line on every message that can't be edited away.
 */
export const OPT_OUT_LINE = "Not relevant? Reply “stop” and we won’t contact you again.";
const SIGNATURE_SITE = "www.nirmaan.online";
const RESEND_GAP_DAYS = 7;

const SYSTEM_PROMPT = `You write first-contact messages for Nirmaan, a small Indian software studio ("You bring the problem. We build the system.").

Write like a thoughtful founder writing one message by hand, not a marketer:
- Open with one specific thing you actually noticed about their business (from the facts given). Never invent details, names, numbers, results or past clients beyond what's given.
- Name the likely problem in their terms, as a question or observation, not an accusation. Don't say their website is bad.
- Offer one small next step: a free 15-minute call, or they can reply with what's slowing them down. No discounts, urgency, flattery or buzzwords.
- Plain text. No emojis, no links except ${SIGNATURE_SITE} in the signature. Indian English is fine.
- Sign off as "{{signoff}}" followed by a line with ${SIGNATURE_SITE}.
- Email: 70 to 130 words, with a short plain subject (under 60 characters, no clickbait). WhatsApp: 40 to 80 words, no subject.
- Do not add an unsubscribe or opt-out line; one is added automatically.

Reply with one JSON object and nothing else: {"subject": "...", "body": "..."}`;

/** "Asha, Nirmaan" when OUTREACH_SENDER_NAME is set, else "Team Nirmaan". */
export function signoff(env: NodeJS.ProcessEnv = process.env): string {
  const name = env.OUTREACH_SENDER_NAME?.trim();
  return name ? `${name}, Nirmaan` : "Team Nirmaan";
}

/** The exact text that goes out: the approved body plus the opt-out line. */
export function finalBody(body: string): string {
  return `${body.trim()}\n\n${OPT_OUT_LINE}`;
}

export function whatsappLink(phone: string | null, body: string): string | null {
  const digits = normalPhone(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(finalBody(body))}` : null;
}

export function parseDraft(raw: string, channel: OutreachChannel): { subject: string | null; body: string } {
  const o = extractJsonObject(raw, "The draft");
  const body = text(o.body, 3000);
  if (body.length < 20) throw new Error("The draft came back empty.");
  const subject = channel === "EMAIL" ? text(o.subject, 120) || "A quick question" : null;
  return { subject, body };
}

async function assertContactable(p: { id: string; code: string; status: string; email: string | null; phone: string | null; website: string | null }) {
  if (["DO_NOT_CONTACT", "DISMISSED", "CONVERTED"].includes(p.status)) throw new Error(`${p.code} is ${p.status.toLowerCase().replaceAll("_", " ")}; it can't be contacted from here.`);
  if (await isSuppressed(p)) throw new Error(`${p.code} matches the do-not-contact list.`);
}

export async function draftOutreach(actor: Actor, prospectId: string, channel: string, deps: { provider?: ModelProvider } = {}) {
  assertCan(actor.role, "prospect:run");
  if (!isOneOf(OUTREACH_CHANNELS, channel)) throw new Error("Pick email or WhatsApp.");
  const p = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  await assertContactable(p);
  if (p.fitScore == null) throw new Error("Check the business first, so the message can say something true about it.");
  const to = channel === "EMAIL" ? normalEmail(p.email) : normalPhone(p.phone);
  if (!to) throw new Error(channel === "EMAIL" ? "There's no email for this business. Add one, or use WhatsApp." : "There's no phone number for this business.");

  const facts = [
    `Channel: ${channel === "EMAIL" ? "email" : "WhatsApp"}`,
    `Business: ${p.name}${p.category ? ` (${p.category})` : ""}${p.city ? `, ${p.city}` : ""}`,
    `Likely problem: ${p.problem}`,
    `What we noticed: ${decodeStringList(p.evidence).join("; ") || "nothing specific"}`,
    p.suggestedPackage && `Package that would probably fit (don't name prices): ${packageName(p.suggestedPackage)}`,
  ].filter(Boolean);
  const { completion } = await callModel({
    task: "outreach-draft",
    taskType: "content",
    systemPrompt: SYSTEM_PROMPT.replace("{{signoff}}", signoff()),
    userPrompt: facts.join("\n"),
    prospectId: p.id,
    provider: deps.provider,
  });
  const draft = parseDraft(completion.text, channel);
  const message = await prisma.outreachMessage.create({
    data: { prospectId: p.id, channel, toAddress: to, subject: draft.subject, body: draft.body, draftedBy: "AGENT" },
  });
  if (p.status === "NEW" || p.status === "AUDITED") await prisma.prospect.update({ where: { id: p.id }, data: { status: "DRAFTED" } });
  await audit(actor, "outreach.drafted", "OutreachMessage", message.id, `${p.code} by ${channel.toLowerCase()}`);
  return message;
}

export async function updateDraft(actor: Actor, messageId: string, input: { subject?: string; body: string; toAddress?: string }) {
  assertCan(actor.role, "prospect:run");
  const m = await prisma.outreachMessage.findUniqueOrThrow({ where: { id: messageId } });
  if (m.status !== "DRAFT") throw new Error("Only a draft can be edited.");
  const body = input.body.trim();
  if (body.length < 20 || body.length > 3000) throw new Error("Keep the message between 20 and 3,000 characters.");
  const to = m.channel === "EMAIL" ? normalEmail(input.toAddress ?? m.toAddress) : normalPhone(input.toAddress ?? m.toAddress);
  if (!to) throw new Error(m.channel === "EMAIL" ? "That email address doesn't look right." : "That phone number doesn't look right.");
  const subject = m.channel === "EMAIL" ? (input.subject ?? m.subject ?? "").trim().slice(0, 120) : null;
  if (m.channel === "EMAIL" && !subject) throw new Error("An email needs a subject.");
  return prisma.outreachMessage.update({ where: { id: m.id }, data: { body, subject, toAddress: to, draftedBy: m.draftedBy === "AGENT" && body !== m.body ? "USER" : m.draftedBy } });
}

export async function cancelDraft(actor: Actor, messageId: string) {
  assertCan(actor.role, "prospect:run");
  await prisma.outreachMessage.updateMany({ where: { id: messageId, status: "DRAFT" }, data: { status: "CANCELLED" } });
}

/** Everything that must be true before a message may go out, whoever sends it. */
async function preflight(actor: Actor, messageId: string, now: Date) {
  assertCan(actor.role, "outreach:send");
  const m = await prisma.outreachMessage.findUniqueOrThrow({ where: { id: messageId }, include: { prospect: true } });
  if (m.status !== "DRAFT") throw new Error("This message has already been handled.");
  await assertContactable(m.prospect);
  // The draft's recipient may have been edited away from the prospect's own details.
  if (await isSuppressed(m.channel === "EMAIL" ? { email: m.toAddress } : { phone: m.toAddress })) {
    throw new Error(`${m.toAddress} is on the do-not-contact list.`);
  }
  const since = new Date(now.getTime() - RESEND_GAP_DAYS * 24 * 60 * 60 * 1000);
  const recent = await prisma.outreachMessage.count({ where: { prospectId: m.prospectId, status: "SENT", sentAt: { gte: since } } });
  if (recent) throw new Error(`${m.prospect.code} was contacted in the last ${RESEND_GAP_DAYS} days. Give them time to reply.`);
  return m;
}

export async function approveAndSendEmail(actor: Actor, messageId: string, deps: { mailer?: Mailer | null; now?: Date } = {}) {
  const now = deps.now ?? new Date();
  const m = await preflight(actor, messageId, now);
  if (m.channel !== "EMAIL") throw new Error("WhatsApp messages are sent from your phone. Open WhatsApp, then mark it sent.");
  const mailer = deps.mailer === undefined ? mailerFromEnv() : deps.mailer;
  if (!mailer) throw new Error("Email sending isn't set up yet (OUTREACH_FROM and SMTP_URL). Copy the message, send it yourself, then press “I sent it myself”.");

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const today = await prisma.outreachMessage.count({ where: { status: "SENT", sentVia: "EMAIL", sentAt: { gte: startOfDay } } });
  if (today >= dailyLimit()) throw new Error(`Today's limit of ${dailyLimit()} emails is reached. Sending in small batches keeps the address out of spam folders.`);

  try {
    const res = await mailer.send({ to: m.toAddress, subject: m.subject ?? "A quick question", text: finalBody(m.body) });
    await prisma.outreachMessage.update({
      where: { id: m.id },
      data: { status: "SENT", sentVia: "EMAIL", sentAt: now, approvedBy: actor.label, providerId: res.id ?? null, sendError: null },
    });
  } catch (err) {
    const reason = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    await prisma.outreachMessage.update({ where: { id: m.id }, data: { sendError: reason } });
    throw new Error(`The email didn't go out: ${reason}`);
  }
  await markContacted(m.prospectId);
  await audit(actor, "outreach.sent", "OutreachMessage", m.id, `${m.prospect.code} by email via ${mailer.name}`);
}

/** The person sent it themselves (WhatsApp, or email from their own inbox). */
export async function markSentManually(actor: Actor, messageId: string, now = new Date()) {
  const m = await preflight(actor, messageId, now);
  await prisma.outreachMessage.update({ where: { id: m.id }, data: { status: "SENT", sentVia: "MANUAL", sentAt: now, approvedBy: actor.label } });
  await markContacted(m.prospectId);
  await audit(actor, "outreach.sent", "OutreachMessage", m.id, `${m.prospect.code} by ${m.channel.toLowerCase()}, sent by hand`);
}

async function markContacted(prospectId: string) {
  await prisma.prospect.updateMany({ where: { id: prospectId, status: { in: ["NEW", "AUDITED", "DRAFTED"] } }, data: { status: "CONTACTED" } });
}
