import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // D-01: No self-registration, admin creates accounts
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // D-02: 30 days
    updateAge: 60 * 60 * 24, // Refresh session token daily
  },
  plugins: [
    admin(), // AUTH-04: adds role field (admin/user) to user table
    nextCookies(), // Proper cookie handling for Next.js server actions
  ],
});
