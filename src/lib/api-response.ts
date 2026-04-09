import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/api";

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 500): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: message }, { status });
}
