/**
 * Local development seed — creates a sample admin user so you can log in
 * with Clerk, then flip your synced User row to ADMIN and explore
 * /dashboard/admin without waiting on real signups.
 *
 * Usage: npm run db:seed -- --clerkId=<your Clerk user id>
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const clerkIdArg = process.argv.find((a) => a.startsWith('--clerkId='));
  const clerkId = clerkIdArg?.split('=')[1];

  if (!clerkId) {
    console.log('No --clerkId=<id> provided — skipping admin seed. Sign in once first, then re-run with your Clerk user id.');
    return;
  }

  const user = await db.user.update({
    where: { clerkId },
    data: { role: 'ADMIN', creditBalance: { increment: 1000 } },
  });

  console.log(`Promoted ${user.email} to ADMIN with ${user.creditBalance} credits.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
