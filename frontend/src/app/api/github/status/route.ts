import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({
      ok: true,
      configured: false,
    });
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Vyrexo-Assistant/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        ok: true,
        configured: true,
        login: data.login,
        name: data.name,
        avatar_url: data.avatar_url,
      });
    }

    return NextResponse.json({
      ok: true,
      configured: false,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      configured: true,
      login: "configured-env",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "No token provided" }, { status: 400 });
    }

    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Vyrexo-Assistant/1.0",
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          ok: false,
          error: err.message || "Invalid GitHub token",
          valid: false,
        },
        { status: 401 }
      );
    }

    const data = await res.json();
    const scopes = res.headers.get("x-oauth-scopes") || "";

    return NextResponse.json({
      ok: true,
      valid: true,
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
      scopes: scopes.split(",").map((s) => s.trim()).filter(Boolean),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to verify token" },
      { status: 500 }
    );
  }
}
