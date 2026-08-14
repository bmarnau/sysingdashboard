/**
 * Verwaltung des Systemhaus-Demo-Datensatzes (Sprint 09B).
 *
 * Trennt bewusst zwei Wirkungsbereiche:
 * - lokal: Projekte, Arbeitspakete, Tätigkeiten — vollständig entfernbar
 * - Cloud: AVKK-Sachverhalte — nur stilllegbar, da die Datenbank kein
 *   Löschen kennt (Historisierung, ADR-0026)
 */
import { useEffect, useState } from "react";
import { Database, Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { can } from "@/lib/rbac/permissions";
import { listUsers } from "@/lib/users-supabase-service";
import type { UserProfile } from "@/lib/user-management";
import {
  DEMO_AVKK_VERSION,
  DEMO_PERSONAS,
  DEMO_DATASET_VERSION,
  demoAvkkCases,
  hasDemoData,
  removeDemoData,
  retireAvkkDemoData,
  seedAvkkDemoData,
  seedDemoData,
} from "@/lib/demo-data";
import type { DemoPersonaAccounts, DemoPersonaId } from "@/lib/demo-data";
import { logger } from "@/lib/logger";

interface DemoDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoDataDialog({ open, onOpenChange }: DemoDataDialogProps) {
  const user = useCurrentUser();
  const mayWriteAvkk = can(user, "avkk.edit");
  const [busy, setBusy] = useState<null | "seed" | "remove" | "avkk" | "retire">(null);
  const [log, setLog] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<DemoPersonaAccounts>({});
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [candidatesError, setCandidatesError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    listUsers()
      .then((users) => {
        if (active) setCandidates(users);
      })
      .catch((error) => {
        logger.warn("Konten für die Demo-Zuordnung nicht lesbar", { error: String(error) });
        if (active) setCandidatesError(true);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const setAccount = (personaId: DemoPersonaId, userId: string) =>
    setAccounts((prev) => {
      const next = { ...prev };
      if (userId === "") delete next[personaId];
      else next[personaId] = userId;
      return next;
    });

  const append = (line: string) => setLog((prev) => [...prev, line]);

  const runLocalSeed = () => {
    const result = seedDemoData();
    append(
      `Lokal eingespielt: ${result.projects} Projekte, ${result.workPackages} Arbeitspakete, ${result.activities} Tätigkeiten${result.replaced ? " (vorhandene Demodaten ersetzt)" : ""}.`,
    );
    toast.success("Demo-Datensatz lokal eingespielt");
  };

  const runLocalRemove = () => {
    const result = removeDemoData();
    append(
      `Lokal entfernt: ${result.projects} Projekte, ${result.workPackages} Arbeitspakete, ${result.activities} Tätigkeiten.`,
    );
    toast.success("Lokale Demodaten entfernt");
  };

  const runAvkkSeed = async () => {
    if (!user?.id) return;
    setBusy("avkk");
    try {
      const result = await seedAvkkDemoData(user.id, accounts);
      append(
        `AVKK eingespielt: ${result.created} Sachverhalte neu, ${result.skipped} vorhanden ` +
          `(davon ${result.reassigned} Verantwortungen neu zugeordnet), ` +
          `${result.responsibilities} Verantwortungen (davon ${result.delegated} auf eigene ` +
          `Demo-Konten), ${result.competences} Kompetenzbewertungen, ` +
          `${result.consequences} Konsequenzen.`,
      );
      for (const failure of result.failures) {
        append(`Verantwortung nicht änderbar — ${failure}`);
      }
      if (result.failures.length > 0) {
        toast.warning("AVKK-Demofälle eingespielt, Zuordnung teilweise nicht möglich");
      } else {
        toast.success("AVKK-Demofälle eingespielt");
      }
    } catch (error) {
      logger.error("Seed der AVKK-Demodaten fehlgeschlagen", { error: String(error) });
      toast.error("AVKK-Demofälle konnten nicht eingespielt werden");
      append(`Fehler: ${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const runAvkkRetire = async () => {
    if (!user?.id) return;
    setBusy("retire");
    try {
      const result = await retireAvkkDemoData(user.id);
      append(`AVKK stillgelegt: ${result.retired} Sachverhalte auf „abgeschlossen" gesetzt.`);
      toast.success("AVKK-Demofälle stillgelegt");
    } catch (error) {
      logger.error("Rücknahme der AVKK-Demodaten fehlgeschlagen", { error: String(error) });
      toast.error("AVKK-Demofälle konnten nicht stillgelegt werden");
      append(`Fehler: ${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-5" aria-hidden="true" />
            Demo-Datensatz
          </DialogTitle>
          <DialogDescription>
            Reproduzierbarer, vollständig fiktiver Systemhaus-Datensatz für Schulung und Abnahme.
            Alle Kennungen tragen das Präfix <code>demo-</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Datensatz {DEMO_DATASET_VERSION}</Badge>
          <Badge variant="secondary">AVKK-Fälle {DEMO_AVKK_VERSION}</Badge>
          <Badge variant="outline">{demoAvkkCases.length} Abnahmefälle</Badge>
          <Badge variant={hasDemoData() ? "default" : "outline"}>
            {hasDemoData() ? "lokal vorhanden" : "lokal nicht vorhanden"}
          </Badge>
        </div>

        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs font-medium text-destructive"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Nicht auf Produktivinstanzen ausführen. AVKK-Demofälle werden historisiert und können
            nicht gelöscht, sondern nur stillgelegt werden. Eine Instanz mit eingespielten Demodaten
            gilt ohne Neuaufbau nicht mehr als saubere Produktivinstanz.
          </span>
        </p>

        <section className="space-y-2 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">Lokaler Bestand</h3>
          <p className="text-xs text-muted-foreground">
            Projekte, Arbeitspakete und Tätigkeiten. Mehrfaches Einspielen erzeugt keine Duplikate,
            das Entfernen wirkt ausschließlich auf <code>demo-</code>-Datensätze.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={runLocalSeed} disabled={busy !== null}>
              Einspielen
            </Button>
            <Button size="sm" variant="outline" onClick={runLocalRemove} disabled={busy !== null}>
              Entfernen
            </Button>
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">AVKK-Abnahmefälle (Datenbank)</h3>
          <p className="text-xs text-muted-foreground">
            Acht zusammenhängende Fälle: unkritisch, gefährdet, kritisch, überfällig,
            Voraussetzungslücke, Wissens-/Informationslücke, hohe Kundenkonsequenz, hohe
            Terminwirkung. Das Einspielen läuft unter Ihren Berechtigungen — es werden keine fremden
            Daten verändert.
          </p>
          <p className="flex items-start gap-2 rounded-md bg-secondary/50 p-2 text-xs">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 opacity-70" aria-hidden="true" />
            <span>
              AVKK-Daten werden nicht gelöscht, sondern stillgelegt. Diese Grenze ist bewusst: Die
              Datenbank kennt kein Löschen von Führungsdaten, damit die Historie belegbar bleibt.
            </span>
          </p>
          {!mayWriteAvkk && (
            <p className="text-xs text-destructive">
              Ihnen fehlt die Berechtigung zum Bearbeiten von AVKK-Daten.
            </p>
          )}
          <div className="space-y-2 rounded-md border border-border/70 p-3">
            <h4 className="text-xs font-semibold">Zuordnung der Demo-Personen</h4>
            <p className="text-xs text-muted-foreground">
              Ohne Zuordnung laufen alle Verantwortungen auf Ihr eigenes Konto — dann ist kein
              Mehrbenutzer-Nachweis möglich. Anleitung: <code>docs/DEMO-USERS.md</code>.
            </p>
            {candidatesError && (
              <p className="text-xs text-destructive">
                Konten konnten nicht gelesen werden. Ohne Administratorrechte ist nur die eigene
                Zuordnung möglich.
              </p>
            )}
            <ul className="space-y-2">
              {DEMO_PERSONAS.map((persona) => (
                <li key={persona.id} className="grid gap-1 sm:grid-cols-2 sm:items-center">
                  <label className="text-xs" htmlFor={`demo-persona-${persona.id}`}>
                    <span className="font-medium">{persona.displayName}</span>
                    <span className="block text-muted-foreground">
                      {persona.functionLabel} · Rolle {persona.requiredRole}
                    </span>
                  </label>
                  <select
                    id={`demo-persona-${persona.id}`}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value={accounts[persona.id] ?? ""}
                    onChange={(e) => setAccount(persona.id, e.target.value)}
                    disabled={busy !== null}
                  >
                    <option value="">eigenes Konto (kein Mehrbenutzer-Nachweis)</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} · {c.role}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={runAvkkSeed} disabled={!mayWriteAvkk || busy !== null}>
              {busy === "avkk" && <Loader2 className="mr-1 size-4 animate-spin" />}
              Einspielen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={runAvkkRetire}
              disabled={!mayWriteAvkk || busy !== null}
            >
              {busy === "retire" && <Loader2 className="mr-1 size-4 animate-spin" />}
              Stilllegen
            </Button>
          </div>
        </section>

        {log.length > 0 && (
          <section className="space-y-1 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">Protokoll</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
