import { NextResponse, type NextRequest } from "next/server";
import { deleteSession, getSession } from "@/lib/shareSessionStore";

/**
 * Companion endpoint to `/api/share`. The client at `/import?session=<id>`
 * calls this to retrieve the receipt file that was POSTed by the share target.
 *
 * Sessions are one-shot: we delete after a successful read so a refresh
 * doesn't reuse the same blob (the user can re-upload manually if needed).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json(
      { error: "Session expired or not found." },
      { status: 404 },
    );
  }

  // One-shot: consuming the session removes it.
  deleteSession(id);

  return NextResponse.json({
    dataUrl: session.dataUrl,
    mimeType: session.mimeType,
    fileName: session.fileName ?? null,
    title: session.title ?? null,
    text: session.text ?? null,
    url: session.url ?? null,
  });
}
