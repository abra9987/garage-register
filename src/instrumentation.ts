export async function register() {
  // Only run on server (not during build or edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { auth } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { user } = await import("@/lib/db/schema");
    const { count, eq } = await import("drizzle-orm");

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

        // Create user via Better Auth API (works without existing session)
        await auth.api.signUpEmail({
          body: { email, password, name: "Admin" },
        });

        // Set role to admin (admin plugin adds the role column)
        await db
          .update(user)
          .set({ role: "admin" })
          .where(eq(user.email, email));

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
