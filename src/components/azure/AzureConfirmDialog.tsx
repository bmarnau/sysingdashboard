import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AzureConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  warning: string;
  /** Optionales Schutz-Token: der Nutzer muss diesen Text eintippen. */
  requireText?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/**
 * Generisches Bestätigungs-Dialog mit deutlich sichtbarem Warnhinweis
 * und optionalem Text-Token als Missklick-Schutz für kritische Aktionen.
 */
export function AzureConfirmDialog({
  open,
  onOpenChange,
  title,
  warning,
  requireText,
  confirmLabel = "Bestätigen",
  onConfirm,
}: AzureConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const tokenOk = requireText ? typed.trim() === requireText : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-warning">{warning}</DialogDescription>
        </DialogHeader>

        {requireText ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Tippen Sie zum Fortfahren <span className="font-mono">{requireText}</span> ein.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              autoFocus
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            disabled={!tokenOk}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
