"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrency } from "@/hooks/useCurrency";
import { localizeOcrStatus, runOCR } from "@/lib/ocr";
import { parseReceipt, type ParsedReceipt } from "@/lib/receiptParser";
import { cn, formatCurrency, todayISO } from "@/lib/utils";
import type { TransactionType } from "@/lib/types";

type ImportStage = "upload" | "processing" | "confirm";

interface ConfirmFormState {
  amount: string;
  type: TransactionType;
  categoryId: string;
  date: string;
  notes: string;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

export const ImportClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const { categories } = useCategories();
  const { addTransaction } = useTransactions();
  const { config: currencyConfig } = useCurrency();

  const [stage, setStage] = React.useState<ImportStage>("upload");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewMime, setPreviewMime] = React.useState<string>("");
  const [progress, setProgress] = React.useState<number>(0);
  const [statusLabel, setStatusLabel] = React.useState<string>("Bersiap...");
  const [parsed, setParsed] = React.useState<ParsedReceipt | null>(null);
  const [form, setForm] = React.useState<ConfirmFormState | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>("");
  const [saved, setSaved] = React.useState<boolean>(false);
  const [showRawText, setShowRawText] = React.useState<boolean>(false);

  const abortRef = React.useRef<AbortController | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const sessionFetchedRef = React.useRef<string | null>(null);

  // Prefer expense-capable categories — most receipts are expenses.
  const expenseCategories = React.useMemo(
    () => categories.filter((c) => c.type === "expense" || c.type === "both"),
    [categories],
  );
  const incomeCategories = React.useMemo(
    () => categories.filter((c) => c.type === "income" || c.type === "both"),
    [categories],
  );
  const visibleCategories = form?.type === "income" ? incomeCategories : expenseCategories;

  // ------------------------------------------------------------------
  // OCR pipeline
  // ------------------------------------------------------------------

  const runPipelineOnDataUrl = React.useCallback(
    async (dataUrl: string, mime: string) => {
      setPreviewUrl(dataUrl);
      setPreviewMime(mime);
      setStage("processing");
      setProgress(0);
      setStatusLabel("Memuat mesin OCR...");
      setErrorMessage("");

      // Cancel any in-flight job before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // PDFs aren't directly readable by Tesseract — surface a graceful
      // empty result so the user can fill the form manually.
      let ocrText = "";
      if (mime === "application/pdf") {
        setStatusLabel("PDF terdeteksi — silakan isi manual");
        await new Promise((r) => setTimeout(r, 250));
      } else {
        ocrText = await runOCR(dataUrl, {
          signal: controller.signal,
          onProgress: ({ progress: p, status }) => {
            setProgress(Math.round(p * 100));
            setStatusLabel(localizeOcrStatus(status));
          },
        });
      }

      if (controller.signal.aborted) return;

      const result = parseReceipt(ocrText);
      setParsed(result);

      // Pick a sensible default category for expenses.
      const defaultCategory =
        expenseCategories.find((c) => c.id === "cat-food") ??
        expenseCategories.find((c) => c.id === "cat-other") ??
        expenseCategories[0];

      setForm({
        amount: result.amount !== null ? String(Math.round(result.amount * 100) / 100) : "",
        type: "expense",
        categoryId: defaultCategory?.id ?? "",
        date: result.date || todayISO(),
        notes: result.merchant || "",
      });
      setStage("confirm");
      setProgress(100);
      setStatusLabel("Selesai");
    },
    [expenseCategories],
  );

  // ------------------------------------------------------------------
  // Share-target pickup: GET /api/share/session?id=...
  // ------------------------------------------------------------------

  React.useEffect(() => {
    if (!sessionId) return;
    if (sessionFetchedRef.current === sessionId) return;
    sessionFetchedRef.current = sessionId;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/share/session?id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!cancelled) {
            setErrorMessage(
              res.status === 404
                ? "Sesi berbagi sudah kedaluwarsa. Silakan unggah ulang."
                : "Gagal memuat berkas dari sesi berbagi.",
            );
          }
          return;
        }
        const json = (await res.json()) as {
          dataUrl: string;
          mimeType: string;
        };
        if (!cancelled && json.dataUrl) {
          await runPipelineOnDataUrl(json.dataUrl, json.mimeType);
          // Strip the session id from the URL so a refresh doesn't try to
          // re-fetch a now-deleted session.
          router.replace("/import");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Tidak dapat mengakses sesi berbagi.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router, runPipelineOnDataUrl]);

  // ------------------------------------------------------------------
  // File handling
  // ------------------------------------------------------------------

  const handleFile = React.useCallback(
    async (file: File) => {
      if (!file) return;
      const valid =
        file.type.startsWith("image/") || file.type === "application/pdf";
      if (!valid) {
        setErrorMessage(
          "Format tidak didukung. Gunakan gambar (JPG/PNG) atau PDF.",
        );
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Ukuran berkas melebihi 10MB.");
        return;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }).catch(() => "");

      if (!dataUrl) {
        setErrorMessage("Tidak dapat membaca berkas. Coba lagi.");
        return;
      }
      await runPipelineOnDataUrl(dataUrl, file.type);
    },
    [runPipelineOnDataUrl],
  );

  // ------------------------------------------------------------------
  // Drag & drop
  // ------------------------------------------------------------------

  const [isDragging, setIsDragging] = React.useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  // ------------------------------------------------------------------
  // Stage actions
  // ------------------------------------------------------------------

  const cancelProcessing = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    reset();
  };

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage("upload");
    setPreviewUrl(null);
    setPreviewMime("");
    setProgress(0);
    setStatusLabel("Bersiap...");
    setParsed(null);
    setForm(null);
    setErrorMessage("");
    setSaved(false);
    setShowRawText(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const updateForm = <K extends keyof ConfirmFormState>(
    key: K,
    value: ConfirmFormState[K],
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      // If the type flipped, snap categoryId to a valid one.
      if (key === "type") {
        const list = value === "income" ? incomeCategories : expenseCategories;
        if (!list.some((c) => c.id === next.categoryId)) {
          next.categoryId = list[0]?.id ?? "";
        }
      }
      return next;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Masukkan jumlah yang valid.");
      return;
    }
    if (!form.categoryId) {
      setErrorMessage("Pilih kategori.");
      return;
    }
    if (!form.date) {
      setErrorMessage("Pilih tanggal.");
      return;
    }
    setErrorMessage("");

    addTransaction({
      amount: Math.round(amount * 100) / 100,
      type: form.type,
      categoryId: form.categoryId,
      date: form.date,
      notes: form.notes.trim() || undefined,
    });
    setSaved(true);
    // Brief success state, then route to transactions.
    window.setTimeout(() => {
      router.push("/transactions");
    }, 700);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Impor Struk
          </h2>
          <p className="text-sm text-muted-foreground">
            Foto atau unggah struk — kami baca otomatis dan isikan formulirnya.
          </p>
        </div>
        {stage !== "upload" ? (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Mulai ulang
          </Button>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {stage === "upload" ? (
        <UploadStage
          isDragging={isDragging}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          onFile={handleFile}
        />
      ) : null}

      {stage === "processing" ? (
        <ProcessingStage
          previewUrl={previewUrl}
          previewMime={previewMime}
          progress={progress}
          statusLabel={statusLabel}
          onCancel={cancelProcessing}
        />
      ) : null}

      {stage === "confirm" && form && parsed ? (
        <ConfirmStage
          form={form}
          parsed={parsed}
          previewUrl={previewUrl}
          previewMime={previewMime}
          visibleCategories={visibleCategories}
          showRawText={showRawText}
          setShowRawText={setShowRawText}
          updateForm={updateForm}
          onSubmit={handleSave}
          onReset={reset}
          saved={saved}
          formatPreviewAmount={(value) =>
            value && !Number.isNaN(Number(value))
              ? formatCurrency(Number(value), { currency: currencyConfig })
              : ""
          }
        />
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface UploadStageProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => Promise<void>;
}

const UploadStage: React.FC<UploadStageProps> = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  fileInputRef,
  cameraInputRef,
  onFile,
}) => (
  <Card>
    <CardContent className="p-4 sm:p-6 space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center text-center px-6 py-12 sm:py-16",
          "border-2 border-dashed rounded-xl transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:bg-muted/30",
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ScanLine className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold">Lepaskan struk di sini</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Seret &amp; lepas gambar atau PDF, atau pilih dari galeri / kamera.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-4 w-4" /> Ambil foto
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Pilih dari galeri
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await onFile(file);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await onFile(file);
          }}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div>
          <strong className="text-foreground">Diproses di perangkat Anda.</strong>{" "}
          Format yang didukung: JPEG, PNG, WebP, dan PDF dari GoPay, OVO, DANA,
          BCA Mobile, Mandiri, Alfamart, Indomaret, dan struk umum lainnya.
        </div>
      </div>
    </CardContent>
  </Card>
);

interface ProcessingStageProps {
  previewUrl: string | null;
  previewMime: string;
  progress: number;
  statusLabel: string;
  onCancel: () => void;
}

const ProcessingStage: React.FC<ProcessingStageProps> = ({
  previewUrl,
  previewMime,
  progress,
  statusLabel,
  onCancel,
}) => (
  <Card>
    <CardContent className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-center">
        <div className="aspect-[3/4] w-full sm:w-40 rounded-lg overflow-hidden bg-muted/40 border border-border flex items-center justify-center">
          <ReceiptPreview previewUrl={previewUrl} previewMime={previewMime} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{statusLabel}</span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kemajuan OCR"
          >
            <div
              className="h-full bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Membaca dan menganalisis struk Anda. Ini bisa memakan waktu beberapa detik
            saat pertama kali dijalankan.
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-3.5 w-3.5" /> Batal
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface ConfirmStageProps {
  form: ConfirmFormState;
  parsed: ParsedReceipt;
  previewUrl: string | null;
  previewMime: string;
  visibleCategories: { id: string; name: string }[];
  showRawText: boolean;
  setShowRawText: (v: boolean) => void;
  updateForm: <K extends keyof ConfirmFormState>(
    key: K,
    value: ConfirmFormState[K],
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  saved: boolean;
  formatPreviewAmount: (value: string) => string;
}

const ConfirmStage: React.FC<ConfirmStageProps> = ({
  form,
  parsed,
  previewUrl,
  previewMime,
  visibleCategories,
  showRawText,
  setShowRawText,
  updateForm,
  onSubmit,
  onReset,
  saved,
  formatPreviewAmount,
}) => {
  const lowConfidence = parsed.confidence < 0.5;
  const formattedAmountPreview = formatPreviewAmount(form.amount);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                lowConfidence
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
              )}
            >
              {lowConfidence ? (
                <TriangleAlert className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {lowConfidence ? "Keyakinan rendah" : "Keyakinan tinggi"}
              <span className="opacity-70">
                · {Math.round(parsed.confidence * 100)}%
              </span>
            </Badge>
            {parsed.merchant ? (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                Terdeteksi: {parsed.merchant}
              </span>
            ) : null}
          </div>
          {previewUrl ? (
            <ReceiptThumbnail url={previewUrl} mime={previewMime} />
          ) : null}
        </div>

        {lowConfidence ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Hasil pembacaan kurang yakin. Mohon periksa setiap kolom sebelum
              menyimpan.
            </span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tipe</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateForm("type", "expense")}
                  className={
                    form.type === "expense"
                      ? "h-10 rounded-md border border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-medium"
                      : "h-10 rounded-md border border-border bg-card text-sm text-muted-foreground hover:bg-accent"
                  }
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => updateForm("type", "income")}
                  className={
                    form.type === "income"
                      ? "h-10 rounded-md border border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                      : "h-10 rounded-md border border-border bg-card text-sm text-muted-foreground hover:bg-accent"
                  }
                >
                  Pemasukan
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="import-amount">
                Jumlah
                {parsed.amount === null ? (
                  <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">
                    (tidak terdeteksi)
                  </span>
                ) : null}
              </Label>
              <Input
                id="import-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.amount}
                onChange={(e) => updateForm("amount", e.target.value)}
                className={cn(
                  parsed.amount === null
                    ? "border-amber-500/60 focus-visible:ring-amber-500"
                    : undefined,
                )}
              />
              {formattedAmountPreview ? (
                <p className="text-xs text-muted-foreground">
                  {formattedAmountPreview}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="import-date">Tanggal</Label>
              <Input
                id="import-date"
                type="date"
                value={form.date}
                onChange={(e) => updateForm("date", e.target.value)}
                max={todayISO()}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="import-category">Kategori</Label>
              <Select
                id="import-category"
                value={form.categoryId}
                onChange={(e) => updateForm("categoryId", e.target.value)}
              >
                {visibleCategories.length === 0 ? (
                  <option value="">Tidak ada kategori</option>
                ) : (
                  visibleCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="import-notes">Catatan / Toko</Label>
              <Textarea
                id="import-notes"
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="Nama toko atau keterangan transaksi"
                rows={2}
              />
            </div>
          </div>

          {parsed.rawText ? (
            <div className="rounded-lg border border-border bg-muted/30">
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>{showRawText ? "Sembunyikan" : "Lihat"} teks OCR mentah</span>
                <span className="opacity-60">{showRawText ? "−" : "+"}</span>
              </button>
              {showRawText ? (
                <pre className="px-4 pb-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-auto">
                  {parsed.rawText.trim() || "(kosong)"}
                </pre>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onReset}>
              <RotateCcw className="h-4 w-4" /> Ulangi
            </Button>
            <Button type="submit" disabled={saved}>
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Tersimpan
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Simpan Transaksi
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const ReceiptThumbnail: React.FC<{ url: string; mime: string }> = ({
  url,
  mime,
}) => {
  const [open, setOpen] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent transition-colors"
    >
      <div className="h-8 w-8 rounded overflow-hidden bg-muted flex items-center justify-center">
        <ReceiptPreview previewUrl={url} previewMime={mime} compact />
      </div>
      <span>{open ? "Tutup" : "Lihat"} struk</span>
      {open ? (
        <span className="absolute mt-32 left-0 right-0 z-10 max-w-xs rounded-lg overflow-hidden border border-border bg-card shadow-xl">
          <ReceiptPreview previewUrl={url} previewMime={mime} />
        </span>
      ) : null}
    </button>
  );
};

const ReceiptPreview: React.FC<{
  previewUrl: string | null;
  previewMime: string;
  compact?: boolean;
}> = ({ previewUrl, previewMime, compact }) => {
  if (!previewUrl) {
    return (
      <span className="text-xs text-muted-foreground">Tidak ada pratinjau</span>
    );
  }
  if (previewMime === "application/pdf") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-2 text-center">
        <div className="text-2xl">📄</div>
        {!compact ? (
          <span className="text-xs text-muted-foreground">PDF</span>
        ) : null}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={previewUrl}
      alt="Pratinjau struk"
      className="h-full w-full object-cover"
    />
  );
};
