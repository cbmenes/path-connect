import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { importClients, type CsvRow } from "@/lib/sweepbook/clients";
import { PageHeader } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/app/clients/import")({ component: ImportPage });

const HEADERS = ["name", "phone", "email", "address", "notes", "usual_day", "usual_time", "price", "frequency"] as const;

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cols = split(line);
    const row: Record<string, string> = {};
    for (const key of HEADERS) {
      const idx = header.indexOf(key);
      row[key] = idx >= 0 ? cols[idx] ?? "" : "";
    }
    return row as CsvRow;
  });
}

function ImportPage() {
  const [preview, setPreview] = useState<CsvRow[] | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof importClients>> | null>(null);
  const [busy, setBusy] = useState(false);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPreview(parseCsv(String(reader.result || "")));
    reader.readAsText(file);
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Import clients"
        action={
          <Button variant="outline" asChild>
            <a href="/clients-template.csv" download>
              Download CSV template
            </a>
          </Button>
        }
      />
      <p className="text-sm text-muted">
        Columns: name, phone, email, address, notes, usual day, usual time, price, frequency. After import you will see
        a count and any missing fields.
      </p>
      {!result ? (
        <>
          <label className="grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-paper px-4 py-8 text-center">
            <span className="text-sm text-muted">Drop a CSV here or choose a file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
          {preview ? (
            <Card>
              <p className="font-medium">{preview.length} rows ready</p>
              <div className="mt-3 overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-muted">
                      {HEADERS.map((h) => (
                        <th key={h} className="pr-3 font-medium">
                          {h.replaceAll("_", " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {HEADERS.map((h) => (
                          <td key={h} className="py-1 pr-3">
                            {r[h] || <span className="text-warn">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                className="mt-4"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await importClients({ data: preview });
                    setResult(res);
                    toast.success(`Imported ${res.importedCount} clients.`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Import failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Importing…" : "Import these clients"}
              </Button>
            </Card>
          ) : null}
        </>
      ) : (
        <Card className="grid gap-3">
          <h2 className="font-display text-2xl text-navy">Import review</h2>
          <p>
            Imported <span className="tabular font-medium">{result.importedCount}</span> clients
            {result.skipped ? ` · skipped ${result.skipped} empty rows` : ""}.
          </p>
          <p>
            {result.missingCount} household{result.missingCount === 1 ? "" : "s"} are missing fields. You can fill them
            in on each profile.
          </p>
          <ul className="grid gap-2 text-sm">
            {result.imported.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
                <Link to="/app/clients/$id" params={{ id: r.id }} className="font-medium text-navy">
                  {r.name}
                </Link>
                <span className="text-muted">
                  {r.missing.length ? `Missing: ${r.missing.join(", ")}` : "Complete"}
                </span>
              </li>
            ))}
          </ul>
          <Button asChild>
            <Link to="/app/clients">Back to client list</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
