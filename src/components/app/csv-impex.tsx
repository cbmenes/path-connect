import { useMemo, useState } from "react";
import { toast } from "sonner";
import { exportCsv, importCsv, type ImportResult } from "@/lib/sweepbook/impex";
import {
  REQUIRED_FIELDS,
  TEMPLATE_FIELDS,
  applyMapping,
  blankTemplate,
  downloadCsv,
  guessMapping,
  headersMatchTemplate,
  parseCsvText,
  type CsvKind,
  type ImportMode,
} from "@/lib/sweepbook/csv";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";

const KIND_LABEL: Record<CsvKind, string> = {
  clients: "Clients",
  team: "Team",
  schedule: "Schedule",
};

function previewErrors(kind: CsvKind, rows: Record<string, string>[]) {
  const required = REQUIRED_FIELDS[kind];
  const errors: string[] = [];
  rows.slice(0, 5).forEach((row, i) => {
    for (const field of required) {
      if (!(row[field] || "").trim()) errors.push(`Row ${i + 1}: missing ${field.replaceAll("_", " ")}`);
    }
  });
  return errors;
}

export function downloadBlankTemplate(kind: CsvKind) {
  downloadCsv(`crewweek-${kind}-template.csv`, blankTemplate(kind));
}

export async function downloadExport(kind: CsvKind) {
  const res = await exportCsv({ data: kind });
  downloadCsv(res.filename, res.csv);
}

export function CsvImportPanel({ initialKind = "clients" }: { initialKind?: CsvKind }) {
  const [kind, setKind] = useState<CsvKind>(initialKind);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [needsMap, setNeedsMap] = useState(false);
  const [mapped, setMapped] = useState<Record<string, string>[] | null>(null);
  const [mode, setMode] = useState<ImportMode>("add");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const fields = TEMPLATE_FIELDS[kind];
  const errors = useMemo(() => (mapped ? previewErrors(kind, mapped) : []), [kind, mapped]);

  function resetFile() {
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setNeedsMap(false);
    setMapped(null);
    setResult(null);
  }

  function applyKind(next: CsvKind) {
    setKind(next);
    resetFile();
  }

  function onText(text: string) {
    const parsed = parseCsvText(text);
    if (!parsed.headers.length) {
      toast.error("That file has no header row.");
      return;
    }
    setHeaders(parsed.headers);
    setRawRows(parsed.rows);
    setResult(null);
    const guessed = guessMapping(kind, parsed.headers);
    setMapping(guessed);
    if (headersMatchTemplate(kind, parsed.headers)) {
      setNeedsMap(false);
      setMapped(applyMapping(parsed.headers, parsed.rows, guessed, fields));
    } else {
      setNeedsMap(true);
      setMapped(null);
    }
  }

  function confirmMapping() {
    const missing = REQUIRED_FIELDS[kind].filter((f) => {
      if (mapping[f]) return false;
      if (f === "first_name" && (headers.includes("name") || headers.includes("full_name"))) return false;
      return true;
    });
    if (missing.length) {
      toast.error(`Map these fields: ${missing.join(", ")}`);
      return;
    }
    setMapped(applyMapping(headers, rawRows, mapping, fields));
    setNeedsMap(false);
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted">
        Use the {APP_NAME} template for the cleanest import. Other apps can work if you map columns.
      </p>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND_LABEL) as CsvKind[]).map((k) => (
          <Button key={k} size="sm" variant={kind === k ? "primary" : "outline"} onClick={() => applyKind(k)}>
            {KIND_LABEL[k]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            void downloadExport(kind).catch((err) =>
              toast.error(err instanceof Error ? err.message : "Could not export."),
            );
          }}
        >
          Download {KIND_LABEL[kind]} CSV
        </Button>
        <Button variant="outline" onClick={() => downloadBlankTemplate(kind)}>
          Download blank template
        </Button>
      </div>

      {result ? (
        <Card className="grid gap-3">
          <h2 className="font-display text-2xl text-navy">Import finished</h2>
          <p>
            {result.imported} imported, {result.skipped} skipped
            {result.warnings.length ? ` · ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}` : ""}.
          </p>
          {result.skips.length ? (
            <ul className="grid gap-1 text-sm text-muted">
              {result.skips.slice(0, 20).map((s, i) => (
                <li key={`${s.row}-${i}`}>
                  Row {s.row}: {s.reason}
                </li>
              ))}
              {result.skips.length > 20 ? <li>…and {result.skips.length - 20} more</li> : null}
            </ul>
          ) : null}
          {result.warnings.length ? (
            <ul className="grid gap-1 text-sm text-warn">
              {result.warnings.slice(0, 12).map((w, i) => (
                <li key={`${w.row}-${i}`}>
                  Row {w.row}: {w.message}
                </li>
              ))}
            </ul>
          ) : null}
          <Button variant="outline" onClick={resetFile}>
            Import another file
          </Button>
        </Card>
      ) : (
        <>
          <label className="grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-paper px-4 py-8 text-center">
            <span className="text-sm text-muted">Drop one CSV here or choose a file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onText(String(reader.result || ""));
                reader.readAsText(file);
                e.target.value = "";
              }}
            />
          </label>

          {needsMap ? (
            <Card className="grid gap-3">
              <h2 className="font-display text-xl text-navy">Map columns</h2>
              <p className="text-sm text-muted">Headers did not match the {APP_NAME} template. Match each field to a column from your file.</p>
              <div className="grid gap-2">
                {fields.map((field) => (
                  <label key={field} className="grid gap-1 sm:grid-cols-[14rem_1fr] sm:items-center">
                    <span className="text-sm font-medium">
                      {field.replaceAll("_", " ")}
                      {REQUIRED_FIELDS[kind].includes(field) ? " *" : ""}
                    </span>
                    <NativeSelect
                      value={mapping[field] ?? ""}
                      onChange={(e) => setMapping((cur) => ({ ...cur, [field]: e.target.value }))}
                    >
                      <option value="">— skip —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                ))}
              </div>
              <Button onClick={confirmMapping}>Use this mapping</Button>
            </Card>
          ) : null}

          {mapped ? (
            <Card className="grid gap-3">
              <h2 className="font-display text-xl text-navy">Preview</h2>
              <p className="text-sm text-muted">
                {mapped.length} row{mapped.length === 1 ? "" : "s"}. Showing the first 5.
              </p>
              {errors.length ? (
                <ul className="text-sm text-warn">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-muted">
                      {fields.map((h) => (
                        <th key={h} className="pr-3 font-medium">
                          {h.replaceAll("_", " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapped.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {fields.map((h) => (
                          <td key={h} className="py-1 pr-3">
                            {r[h] || <span className="text-muted">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">How to save</legend>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="radio" name="mode" checked={mode === "add"} onChange={() => setMode("add")} />
                  Add — skip duplicate emails (and duplicate visits)
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
                  Replace matching emails or visits — does not delete other records
                </label>
              </fieldset>
              <Button
                disabled={busy || mapped.length === 0}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await importCsv({ data: { kind, mode, rows: mapped } });
                    setResult(res);
                    toast.success(`${res.imported} imported, ${res.skipped} skipped.`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Import failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Importing…" : `Confirm import (${mapped.length})`}
              </Button>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
