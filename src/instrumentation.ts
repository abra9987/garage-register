export async function register() {
  // Only run on server (not during build or edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { db } = await import("@/lib/db");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const { user, account } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const { hashPassword } = await import("better-auth/crypto");
    const crypto = await import("crypto");

    // Run Drizzle migrations before anything else
    try {
      await migrate(db, { migrationsFolder: "./drizzle" });
      console.log("[migrate] Migrations applied successfully");
    } catch (error) {
      console.warn("[migrate] Migration error:", error instanceof Error ? error.message : error);
    }

    try {
      const email = process.env.ADMIN_EMAIL;
      const password = process.env.ADMIN_PASSWORD;
      console.log(`[seed] Checking admin user: ${email}, password length: ${password?.length ?? 0}`);

      if (!email || !password) {
        console.error("[seed] ADMIN_EMAIL and ADMIN_PASSWORD env vars required for first deploy");
        return;
      }

      // Check if this specific admin exists (not count — shared DB may have other users)
      const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));

      if (existing.length > 0) {
        // Update password hash on every restart (handles env var changes)
        const hashedPw = await hashPassword(password);
        const { and } = await import("drizzle-orm");
        await db.update(account).set({ password: hashedPw, updatedAt: new Date() })
          .where(and(eq(account.userId, existing[0].id), eq(account.providerId, "credential")));
        console.log(`[seed] Admin user ${email} exists, password hash updated`);
        return;
      }

      const now = new Date();
      const userId = crypto.randomUUID();
      const hashedPassword = await hashPassword(password);

      await db.insert(user).values({
        id: userId,
        name: "Andrey",
        email,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        role: "admin",
      });

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
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("duplicate key")
      ) {
        console.log("[seed] Admin user already exists, skipping");
      } else {
        console.warn("[seed] Could not seed admin user (will retry on next restart):", error instanceof Error ? error.message : error);
      }
    }
  }
}
