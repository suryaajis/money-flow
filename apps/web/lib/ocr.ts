/**
 * Client-side OCR via Tesseract.js.
 *
 * Tesseract pulls in a multi-megabyte WASM bundle plus the language data, so
 * this module is only imported via dynamic `import()` from the receipt
 * scanner page. That keeps it out of the initial JS payload for users who
 * never visit /import.
 *
 * The `runOCR` function is intentionally tolerant — any failure returns an
 * empty string so the caller can still surface a manual-entry form.
 */

export interface OCRProgress {
  /** 0..1 normalized progress reported by Tesseract. */
  progress: number;
  /** Tesseract status string ("loading tesseract core", "recognizing text", ...). */
  status: string;
}

export interface RunOCROptions {
  /** Language codes for Tesseract. Defaults to Indonesian + English. */
  lang?: string;
  /** Progress callback fired throughout load + recognition. */
  onProgress?: (p: OCRProgress) => void;
  /** AbortSignal to cancel OCR in progress (terminates the worker). */
  signal?: AbortSignal;
}

/**
 * Run OCR on an image source (data URL, Blob URL, or HTMLImageElement).
 *
 * Returns the extracted text, or an empty string on any failure. The promise
 * itself never rejects so the UI doesn't need a try/catch boundary.
 */
export async function runOCR(
  image: string | Blob,
  options: RunOCROptions = {},
): Promise<string> {
  const { lang = "ind+eng", onProgress, signal } = options;

  // Bail early if already aborted.
  if (signal?.aborted) return "";

  let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null = null;
  let cancelled = false;

  const abortHandler = () => {
    cancelled = true;
    // Best-effort terminate; we don't await here because we may already be
    // inside the recognize() promise resolution path.
    worker?.terminate().catch(() => {});
  };
  signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const Tesseract = await import("tesseract.js");

    worker = await Tesseract.createWorker(lang, undefined, {
      logger: (msg) => {
        if (cancelled) return;
        // Tesseract emits many stages: "loading tesseract core",
        // "initializing tesseract", "loading language traineddata",
        // "initializing api", "recognizing text". We forward them all so
        // the UI can surface friendly localized labels.
        onProgress?.({
          progress: typeof msg.progress === "number" ? msg.progress : 0,
          status: typeof msg.status === "string" ? msg.status : "",
        });
      },
    });

    if (cancelled) {
      await worker.terminate().catch(() => {});
      return "";
    }

    const result = await worker.recognize(image);
    if (cancelled) return "";

    return result?.data?.text ?? "";
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[ocr] failed:", err);
    }
    return "";
  } finally {
    signal?.removeEventListener("abort", abortHandler);
    if (worker) {
      // Ensure we always free the worker so memory doesn't grow on retries.
      worker.terminate().catch(() => {});
    }
  }
}

/**
 * Map Tesseract's English status strings to localized Indonesian labels for
 * the progress UI on the import page.
 */
export function localizeOcrStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("loading tesseract core")) return "Memuat mesin OCR...";
  if (s.includes("initializing tesseract")) return "Menyiapkan mesin OCR...";
  if (s.includes("loading language")) return "Memuat data bahasa...";
  if (s.includes("initializing api")) return "Menginisialisasi...";
  if (s.includes("recognizing text")) return "Membaca struk...";
  if (s.includes("done")) return "Selesai";
  return status ? "Memproses..." : "Bersiap...";
}
