import type { NextRequest } from "next/server";

import { getAuth } from "@/lib/auth";

async function handle(request: NextRequest) {
  const auth = await getAuth();
  return auth.handler(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
