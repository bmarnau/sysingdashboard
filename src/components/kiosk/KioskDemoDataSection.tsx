import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/rbac/permissions";
import type { UserProfile } from "@/lib/user-management";
import type { KioskDemoDataset } from "@/lib/kiosk/kiosk-demo-dataset";
import { readKioskDemoDataset } from "@/lib/kiosk/kiosk-demo-repository";
import {
  importKioskDemoJsonForActor,
  loadKioskDemoDataForActor,
  removeKioskDemoDataForActor,
} from "@/lib/kiosk/kiosk-demo-service";
import { KIOSK_DEMO_IMPORT_SCHEMA_VERSION } from "@/lib/kiosk/kiosk-demo-import";

export interface KioskDemoDataSectionProps {
  actor: UserProfile | null;
}

export function KioskDemoDataSection({ actor }: KioskDemoDataSectionProps) {
  const mayManage = can(actor, "users.manage");
  const [dataset, setDataset] = useState<KioskDemoDataset | null>(() => readKioskDemoDataset());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDefault = () => {
    if (!actor) return;
    try {
      setError(null);
      setDataset(loadKioskDemoDataForActor(actor));
      setMessage("Kiosk-Demodatensatz geladen.");
    } catch (reason) {
      setMessage(null);
      setError(String(reason));
    }
  };

  const removeDataset = () => {
    if (!actor) return;
    try {
      setError(null);
      removeKioskDemoDataForActor(actor);
      setDataset(null);
      setMessage("Kiosk-Demodaten entfernt.");
    } catch (reason) {
      setMessage(null);
      setError(String(reason));
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!actor || !file) return;
    setBusy(true);
    setError(null);
    try {
      const json = await file.text();
      setDataset(importKioskDemoJsonForActor(actor, json));
      setMessage("Kiosk-Demo-JSON importiert.");
    } catch (reason) {
      setMessage(null);
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Kiosk-Demodatensatz</h3>
          <p className="text-xs text-muted-foreground">
            Ausschließlich synthetische Demo-Daten. Kein Produktivimport; dieser bleibt BSF-05A
            vorbehalten.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{KIOSK_DEMO_IMPORT_SCHEMA_VERSION}</Badge>
          {dataset ? <Badge>Version {dataset.version}</Badge> : <Badge variant="secondary">nicht geladen</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Button size="sm" onClick={loadDefault} disabled={!mayManage || busy}>
          Beispieldatensatz laden
        </Button>
        <label className="grid gap-1 text-xs font-medium">
          Kiosk-Demo-JSON auswählen
          <input
            type="file"
            accept="application/json,.json"
            className="max-w-xs text-xs"
            disabled={!mayManage || busy}
            onChange={(event) => void importFile(event.currentTarget.files?.[0])}
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={removeDataset}
          disabled={!mayManage || busy || !dataset}
        >
          Kiosk-Demodaten entfernen
        </Button>
      </div>

      {!mayManage && (
        <p className="text-xs text-muted-foreground">
          Für Laden, Importieren und Entfernen ist die Berechtigung zur Benutzerverwaltung nötig.
        </p>
      )}
      {message && (
        <p role="status" className="text-xs font-medium text-foreground">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          Import nicht übernommen: {error}
        </p>
      )}
    </section>
  );
}
