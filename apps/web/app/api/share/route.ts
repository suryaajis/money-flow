import { NextResponse, type NextRequest } from "next/server";
import { newSessionId, putSession } from "@/lib/shareSessionStore";

/**
 * Web Share Target endpoint.
 *
 * Registered in `app/manifest.ts` as the `share_target.action`. When a user
 * shares an image / PDF to the installed Money Flow PWA, the OS POSTs a
 * multipart form here with the file attached as `file` plus optional
 * `title`/`text`/`url` text params.
 *
 * We can't render the OCR UI in this handler (OCR runs client-side via
 * Tesseract.js + WASM in the browser). So we stash the file in an in-memory
 * session map keyed by a short id and redirect the user to
 * `/import?session=<id>`, where the client component fetches the data via
 * `/api/share/session`.
 */

// The Node runtime is required because we need `Buffer` and a stable
// in-memory Map across requests (the edge runtime has neither).
export const runtime = "nodejs";

// Don't cache POSTs to a share target.
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB ceiling on uploaded receipts

export async function POST(request: NextRequest): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form-data payload." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob) || file.size === 0) {
    // No usable file in the share — just send the user to the import page so
    // they can manually pick one.
    return NextResponse.redirect(new URL("/import", request.url), 303);
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 10 MB)." },
      { status: 413 },
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!/^image\//.test(mimeType) && mimeType !== "application/pdf") {
    return NextResponse.json(
      { error: "Unsupported file type." },
      { status: 415 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const fileName =
    file instanceof File && file.name ? file.name : undefined;
  const title = formData.get("title");
  const text = formData.get("text");
  const url = formData.get("url");

  const id = newSessionId();
  putSession(id, {
    dataUrl,
    mimeType,
    fileName,
    title: typeof title === "string" ? title : undefined,
    text: typeof text === "string" ? text : undefined,
    url: typeof url === "string" ? url : undefined,
    createdAt: Date.now(),
  });

  // 303 ensures the browser follows with a GET (per RFC 7231) — important
  // because the share target is a POST and we want a clean navigation to the
  // import page.
  return NextResponse.redirect(
    new URL(`/import?session=${id}`, request.url),
    303,
  );
}

// Some platforms probe the share target with a GET. Send users to /import.
export async function GET(request: NextRequest): Promise<Response> {
  return NextResponse.redirect(new URL("/import", request.url), 302);
}
