import type { FetchedSite } from "./safeFetch";

/**
 * What a quick look at a business's homepage says, as plain facts Claude
 * (and a person) can check: is it on phones, how heavy is it, can a customer
 * book or buy, is it stale. Deterministic, so the same page always gives the
 * same signals; the judgement happens later, in audit.ts.
 */
export interface SiteSignals {
  hasWebsite: boolean;
  /** Set when a website was listed but couldn't be read. */
  unreachable?: string;
  url?: string;
  https?: boolean;
  status?: number;
  loadMs?: number;
  pageKb?: number;
  title?: string;
  description?: string;
  mobileFriendly?: boolean;
  platform?: string;
  whatsapp?: boolean;
  phoneLink?: boolean;
  contactForm?: boolean;
  booking?: boolean;
  onlineStore?: boolean;
  payments?: boolean;
  latestYear?: number;
  words?: number;
  emails: string[];
  social: string[];
}

const PLATFORMS: [string, RegExp][] = [
  ["Shopify", /cdn\.shopify\.com|Shopify\.theme/i],
  ["Wix", /wixstatic\.com|wix\.com|_wixCssImports/i],
  ["Squarespace", /squarespace\.com|static1\.squarespace/i],
  ["WordPress", /wp-content|wp-includes/i],
  ["GoDaddy builder", /img1\.wsimg\.com|godaddy/i],
  ["Webflow", /webflow\.com|w-webflow/i],
  ["Google Sites", /sites\.google\.com/i],
  ["Blogger", /blogger\.com|blogspot\.com/i],
];

const JUNK_EMAIL = /(example\.|sentry|wixpress|@2x|\.(png|jpe?g|gif|svg|webp)$|u003e|your-?email|email@domain|name@)/i;

export function extractSignals(site: FetchedSite): SiteSignals {
  const html = site.html;
  const lower = html.toLowerCase();
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const meta = (name: string) =>
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i").exec(html)?.[1] ??
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i").exec(html)?.[1];

  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1])).filter((y) => y > 1995 && y < 2100);
  const emails = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) emails.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) emails.add(m[0].toLowerCase());
  const social = [...new Set([...html.matchAll(/https?:\/\/(?:www\.)?(instagram\.com|facebook\.com|linkedin\.com|youtube\.com)\/[^"'\s<>]+/gi)].map((m) => m[1].toLowerCase()))];

  return {
    hasWebsite: true,
    url: site.finalUrl,
    https: site.finalUrl.startsWith("https:"),
    status: site.status,
    loadMs: site.ms,
    pageKb: Math.round(site.bytes / 1024),
    title: /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim().slice(0, 150) || undefined,
    description: meta("description")?.trim().slice(0, 300) || undefined,
    mobileFriendly: /<meta[^>]+name=["']viewport["'][^>]*width=device-width/i.test(html),
    platform: PLATFORMS.find(([, re]) => re.test(html))?.[0],
    whatsapp: /wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com/i.test(lower),
    phoneLink: /href=["']tel:/i.test(html),
    contactForm: /<form[\s>]/i.test(html),
    booking: /book (an? )?appointment|book now|book online|schedule (a|an|your)|reserve a table|calendly\.com|setmore|practo\.com\/|zocdoc/i.test(text + lower),
    onlineStore: /add to cart|add to bag|\/cart\b|checkout|woocommerce|cdn\.shopify\.com/i.test(lower),
    payments: /razorpay|paytm|phonepe|stripe\.com|cashfree|payu|instamojo/i.test(lower),
    latestYear: years.length ? Math.max(...years) : undefined,
    words: text ? text.split(" ").length : 0,
    emails: [...emails].filter((e) => !JUNK_EMAIL.test(e) && e.length <= 254).slice(0, 5),
    social,
  };
}

/** The signals as short lines for a prompt or a person. */
export function describeSignals(s: SiteSignals): string[] {
  if (!s.hasWebsite) return [s.unreachable ? `Website listed but couldn't be read: ${s.unreachable}` : "No website found"];
  const lines = [
    `Website: ${s.url} (HTTP ${s.status}${s.https ? "" : ", not HTTPS"})`,
    `Homepage: ${s.pageKb} KB, fetched in ${((s.loadMs ?? 0) / 1000).toFixed(1)} s`,
    s.mobileFriendly ? "Set up for phones (viewport tag)" : "Not set up for phones (no viewport tag)",
    s.platform ? `Built with ${s.platform}` : "Platform: custom or unknown",
    `Customer actions: ${[s.whatsapp && "WhatsApp link", s.phoneLink && "tap-to-call", s.contactForm && "form", s.booking && "online booking", s.onlineStore && "online store", s.payments && "online payments"].filter(Boolean).join(", ") || "none found"}`,
  ];
  if (s.latestYear) lines.push(`Latest year mentioned in the footer: ${s.latestYear}`);
  if (s.title) lines.push(`Title: ${s.title}`);
  if (s.description) lines.push(`Description: ${s.description}`);
  if ((s.words ?? 0) < 150) lines.push(`Very little text on the homepage (${s.words} words)`);
  return lines;
}
