import { NextRequest, NextResponse } from "next/server";
import { getServerUserProfile, setServerUserProfile } from "@/lib/server-profile-store";
import { DEFAULT_USER_PROFILE } from "@/lib/user-profile";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId =
    searchParams.get("user_id") ||
    searchParams.get("userId") ||
    request.headers.get("x-user-id") ||
    "default";

  const profile = getServerUserProfile(userId) || DEFAULT_USER_PROFILE;
  return NextResponse.json({
    ok: true,
    profile,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId =
      body.user_id ||
      body.userId ||
      request.headers.get("x-user-id") ||
      "default";

    const saved = setServerUserProfile(userId, body.profile || body);
    return NextResponse.json({
      ok: true,
      profile: saved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to save profile" },
      { status: 400 }
    );
  }
}
