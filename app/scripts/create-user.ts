/**
 * Creates an internal Nirmaan OS account from the command line. This is how
 * the first founder account is made (there is no public sign-up).
 *
 *   NIRMAAN_PASSWORD='a long passphrase' npm run user:create -- you@example.com "Your Name" FOUNDER
 *
 * The password comes from the environment, not argv, so it doesn't end up
 * in shell history or the process list.
 */
import { createUser } from "../src/lib/team/service";
import { prisma } from "../src/lib/db/client";

async function main() {
  const [email, name, role = "FOUNDER"] = process.argv.slice(2);
  const password = process.env.NIRMAAN_PASSWORD ?? "";
  if (!email || !name || !password) {
    console.error('Usage: NIRMAAN_PASSWORD=... npm run user:create -- <email> "<name>" [ROLE]');
    process.exit(1);
  }
  const user = await createUser(null, { email, name, role, password });
  console.log(`Created ${user.role} account for ${user.email}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
