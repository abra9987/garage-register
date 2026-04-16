import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouses } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ilike, asc } from "drizzle-orm";

// GET /api/warehouses?q=search
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();

  let query = db
    .select()
    .from(warehouses)
    .orderBy(asc(warehouses.name))
    .$dynamic();

  if (q && q.length >= 2) {
    query = query.where(ilike(warehouses.name, `%${q}%`));
  }

  const rows = await query.limit(50);
  return NextResponse.json({ data: rows });
}

// POST /api/warehouses
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, address } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(warehouses)
    .values({
      name: name.trim(),
      address: address?.trim() || null,
    })
    .returning();

  return NextResponse.json({ data: row });
}
