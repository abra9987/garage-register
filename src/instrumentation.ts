export async function register() {
  // Only run on server (not during build or edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { db } = await import("@/lib/db");
    const { user, account } = await import("@/lib/db/schema");
    const { count } = await import("drizzle-orm");
    const { hashPassword } = await import("better-auth/crypto");
    const crypto = await import("crypto");

    try {
      const [result] = await db.select({ count: count() }).from(user);

      if (result.count === 0) {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
          console.error(
            "[seed] ADMIN_EMAIL and ADMIN_PASSWORD env vars required for first deploy"
          );
          return;
        }

        const now = new Date();
        const userId = crypto.randomUUID();

        // Hash password using Better Auth's own hashing (scrypt)
        const hashedPassword = await hashPassword(password);

        // Insert user directly via Drizzle (bypasses disableSignUp restriction)
        await db.insert(user).values({
          id: userId,
          name: "Admin",
          email,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          role: "admin",
        });

        // Insert credential account (Better Auth stores password in account table)
        await db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        });

        console.log(`[seed] Admin user created: ${email}`);
      }
    } catch (error) {
      // Ignore duplicate key errors (race condition safe per Pitfall 4)
      if (
        error instanceof Error &&
        error.message.includes("duplicate key")
      ) {
        console.log("[seed] Admin user already exists, skipping");
      } else {
        console.error("[seed] Failed to seed admin user:", error);
      }
    }
  }
}
