"use client";

import { useRef, useState } from "react";
import { backupApi, BackupData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ImportMode = "merge" | "replace";

export default function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const data = await backupApi.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `money-flow-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccessMessage("Backup exported successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed.";
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSuccessMessage(null);
    setErrorMessage(null);
    setParsedBackup(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as BackupData;
        if (
          typeof parsed.version !== "number" ||
          !Array.isArray(parsed.transactions) ||
          !Array.isArray(parsed.categories)
        ) {
          setErrorMessage("Invalid backup file format.");
          return;
        }
        setParsedBackup(parsed);
      } catch {
        setErrorMessage("Failed to parse backup file. Make sure it is a valid JSON.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsedBackup) return;

    setIsImporting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const result = await backupApi.import(parsedBackup, mode);
      setSuccessMessage(
        `Import successful! ${result.imported} item${result.imported !== 1 ? "s" : ""} imported.`
      );
      setParsedBackup(null);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setErrorMessage(msg);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Backup &amp; Restore</h2>
        <p className="text-sm text-muted-foreground">
          Export your data as a JSON file or restore it from a previous backup.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>
            Download all your transactions and categories as a JSON backup file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting…" : "Download backup"}
          </Button>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle>Import</CardTitle>
          <CardDescription>
            Restore data from a previously exported backup file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File picker */}
          <div className="space-y-2">
            <label
              htmlFor="backup-file"
              className="text-sm font-medium leading-none"
            >
              Backup file
            </label>
            <input
              ref={fileInputRef}
              id="backup-file"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:cursor-pointer"
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">Selected: {fileName}</p>
            )}
          </div>

          {/* Preview */}
          {parsedBackup && (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">Preview</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>{parsedBackup.transactions.length} transaction{parsedBackup.transactions.length !== 1 ? "s" : ""}</li>
                <li>{parsedBackup.categories.length} categor{parsedBackup.categories.length !== 1 ? "ies" : "y"}</li>
                <li>Exported at: {new Date(parsedBackup.exportedAt).toLocaleString()}</li>
              </ul>
            </div>
          )}

          {/* Mode selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">Import mode</p>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={mode === "merge"}
                  onChange={() => setMode("merge")}
                  className="accent-primary"
                />
                <span>
                  <span className="font-medium">Merge</span>
                  <span className="ml-1 text-muted-foreground">— keep existing data, add new entries only</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  value="replace"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="accent-primary"
                />
                <span>
                  <span className="font-medium">Replace</span>
                  <span className="ml-1 text-muted-foreground">— delete existing data and restore from backup</span>
                </span>
              </label>
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={!parsedBackup || isImporting}
            variant={mode === "replace" ? "destructive" : "default"}
          >
            {isImporting ? "Importing…" : mode === "replace" ? "Replace & import" : "Merge & import"}
          </Button>

          {mode === "replace" && (
            <p className="text-xs text-destructive">
              Warning: Replace mode will permanently delete all your current transactions and non-default categories.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
