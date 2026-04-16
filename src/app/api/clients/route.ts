import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ilike, desc, asc } from "drizzle-orm";

// GET /api/clients?q=search — list clients, optional search
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();

  let query = db
    .select()
    .from(clients)
    .orderBy(asc(clients.name))
    .$dynamic();

  if (q && q.length >= 2) {
    query = query.where(ilike(clients.name, `%${q}%`));
  }

  const rows = await query.limit(50);
  return NextResponse.json({ data: rows });
}

// POST /api/clients — create a new client
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, address, phone, email } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(clients)
    .values({
      name: name.trim(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
    })
    .returning();

  return NextResponse.json({ data: row });
}
