import { Component, type ErrorInfo, type ReactNode } from "react";
import { Cloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AzureStatusPanel } from "./AzureStatusPanel";
import { AzureActionsPanel } from "./AzureActionsPanel";
import { AzureHistoryPanel } from "./AzureHistoryPanel";

interface AzureDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * AzureDataDialog — Einstiegspunkt zum Bereich "Azure Daten".
 *
 * Enthält drei Tabs: Status · Aktionen · Historie. Ein Fehler in
 * einem Panel darf das Dashboard nie beeinträchtigen — deshalb ein
 * dedizierter ErrorBoundary um den Inhalt.
 */
export function AzureDataDialog({ open, onOpenChange }: AzureDataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="size-5" />
            Azure Daten
          </DialogTitle>
          <DialogDescription>
            Status, manuelle Aktionen und lokale Historie. Alle Aktionen werden ausschließlich per
            Button gestartet — es läuft nichts automatisch. Fehlt die Azure-Konfiguration, bleibt
            der Bereich sichtbar und weist auf „Not configured" hin.
          </DialogDescription>
        </DialogHeader>
        <AzureBoundary>
          <Tabs defaultValue="status">
            <TabsList>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="actions">Aktionen</TabsTrigger>
              <TabsTrigger value="history">Historie</TabsTrigger>
            </TabsList>
            <TabsContent value="status">
              <AzureStatusPanel />
            </TabsContent>
            <TabsContent value="actions">
              <AzureActionsPanel />
            </TabsContent>
            <TabsContent value="history">
              <AzureHistoryPanel />
            </TabsContent>
          </Tabs>
        </AzureBoundary>
      </DialogContent>
    </Dialog>
  );
}

class AzureBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Bewusst nur console — kein Rethrow, damit das restliche Dashboard läuft.
    console.error("[AzureDataDialog]", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          <p className="font-semibold">Azure-Bereich derzeit nicht verfügbar.</p>
          <p className="text-xs">
            Das übrige Dashboard bleibt uneingeschränkt nutzbar. Details:{" "}
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
