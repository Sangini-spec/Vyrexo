import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "healthy",
    version: "0.1.0",
    service: "Vyrexo API",
    time: new Date().toISOString(),
  });
}
