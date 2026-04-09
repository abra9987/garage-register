import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// max:3 for shared PostgreSQL on Hetzner CX43 (per Pitfall 3 in RESEARCH.md)
// prepare:false for compatibility with connection poolers (per Pitfall 2)
const client = postgres(connectionString, { max: 3, prepare: false });

export const db = drizzle(client, { schema });
