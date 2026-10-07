import { NextResponse } from "next/server";

export async function POST() {
  // Returns the active project workspace
  return NextResponse.json({
    ok: true,
    path: "/projects/vyrexo-workspace",
    name: "vyrexo-workspace",
  });
}
