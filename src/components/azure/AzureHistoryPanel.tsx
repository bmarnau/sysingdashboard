import { useSyncExternalStore } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AzureHistoryStore } from "@/lib/azure/azure-history-store";
import type { AzureHistoryEntry, AzureHistorySnapshot } from "@/lib/azure/types";

/**
 * AzureHistoryPanel — zeigt die drei lokalen Historien-Kanäle:
 * Verbindungstests, Exporte, Importe. Datenquelle: `AzureHistoryStore`.
 */
export function AzureHistoryPanel() {
  const snap = useSyncExternalStore(
    AzureHistoryStore.subscribe,
    AzureHistoryStore.snapshot,
    emptySnapshot,
  );
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Historie</h3>
        <p className="text-xs text-muted-foreground">
          Lokale Anzeige-Historie im Browser. Keine Secrets, keine Rohdaten.
        </p>
      </div>
      <Tabs defaultValue="tests">
        <TabsList>
          <TabsTrigger value="tests">Verbindungstests ({snap.connectionTests.length})</TabsTrigger>
          <TabsTrigger value="exports">Exporte ({snap.exports.length})</TabsTrigger>
          <TabsTrigger value="imports">Importe ({snap.imports.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="tests">
          <HistoryTable entries={snap.connectionTests} />
        </TabsContent>
        <TabsContent value="exports">
          <HistoryTable entries={snap.exports} />
        </TabsContent>
        <TabsContent value="imports">
          <HistoryTable entries={snap.imports} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function emptySnapshot(): AzureHistorySnapshot {
  return { connectionTests: [], exports: [], imports: [] };
}

function HistoryTable({ entries }: { entries: AzureHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Noch keine Einträge.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left">Zeit</th>
            <th className="px-2 py-2 text-left">Ergebnis</th>
            <th className="px-2 py-2 text-left">Auslöser</th>
            <th className="px-2 py-2 text-left">Dauer</th>
            <th className="px-2 py-2 text-left">Meldung</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t border-border">
              <td className="px-2 py-1.5 whitespace-nowrap">
                {new Date(e.at).toLocaleString("de-DE")}
              </td>
              <td className="px-2 py-1.5">
                {e.ok ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="size-4" /> ok
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <XCircle className="size-4" /> failed
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5">{e.actor}</td>
              <td className="px-2 py-1.5">{e.durationMs != null ? `${e.durationMs} ms` : "—"}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
