import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Check, Lock, ShieldAlert, UserCog, Users, X } from "lucide-react";
import {
  ALL_ROLES,
  ROLE_LABEL,
  STATUS_LABEL,
  initialsOf,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from "@/lib/user-management";
import { useUsers } from "@/hooks/useCurrentUser";
import { can } from "@/lib/rbac/permissions";
import {
  setUserRole as svcSetUserRole,
  setUserStatus as svcSetUserStatus,
  updateOwnProfile,
  updateUserProfile,
} from "@/lib/users-supabase-service";

type TabKey = "profil" | "verwaltung";

export interface UserManagementDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialTab?: TabKey;
  /** Wird beibehalten für API-Kompatibilität; mit echter Auth ohne Wirkung. */
  onProfileSwitch?: (newUserId: string) => void;
}

function statusStyle(s: UserStatus): string {
  switch (s) {
    case "active":
      return "bg-success/15 text-success border-success/30";
    case "inactive":
      return "bg-muted text-muted-foreground border-border";
    case "locked":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "archived":
      return "bg-warning/15 text-warning border-warning/30";
  }
}

function roleStyle(r: UserRole): string {
  switch (r) {
    case "systemadministrator":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "administrator":
      return "bg-primary/15 text-primary border-primary/30";
    case "teamlead":
      return "bg-info/15 text-info border-info/30";
    case "engineer":
      return "bg-success/15 text-success border-success/30";
    case "projectmanager":
      return "bg-warning/15 text-warning border-warning/30";
    case "customer":
      return "bg-muted text-muted-foreground border-border";
    case "viewer":
      return "bg-secondary text-muted-foreground border-border";
  }
}

export function UserManagementDialog({
  open,
  onClose,
  currentUser,
  initialTab = "profil",
}: UserManagementDialogProps) {
  const { users, loading, refresh } = useUsers();
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  const canAdmin = can(currentUser, "users.manage");
  const canManageRoles = can(currentUser, "roles.manage");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[var(--shadow-elevated)]">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <UserCog className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Benutzer & Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
            aria-label="Schließen"
          >
            <X className="size-4" />
          </button>
        </header>

        <nav
          role="tablist"
          aria-label="Bereiche"
          className="flex gap-1 border-b border-border px-3 py-2"
        >
          <TabBtn active={tab === "profil"} onClick={() => setTab("profil")}>
            Mein Profil
          </TabBtn>
          {canAdmin && (
            <TabBtn active={tab === "verwaltung"} onClick={() => setTab("verwaltung")}>
              Benutzerverwaltung
            </TabBtn>
          )}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "profil" && <ProfileEditor user={currentUser} onSaved={refresh} />}
          {tab === "verwaltung" && canAdmin && (
            <UserAdmin
              users={users}
              loading={loading}
              currentUserId={currentUser.id}
              canManageRoles={canManageRoles}
              onChanged={refresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Mein Profil -------------------------------- */

function ProfileEditor({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    phone: user.phone,
    profileImage: user.profileImage ?? "",
  });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      phone: user.phone,
      profileImage: user.profileImage ?? "",
    });
    setDirty(false);
    setSaved(false);
    setError(null);
  }, [user.id]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setSaved(false);
  };

  const onPickImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 1024 * 1024) {
      setError("Bild ist zu groß (max. 1 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("profileImage", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Vor- und Nachname sind erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateOwnProfile(user.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName:
          form.displayName.trim() || `${form.firstName.trim()} ${form.lastName.trim()}`,
        phone: form.phone.trim(),
        profileImage: form.profileImage || null,
      });
      setDirty(false);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      phone: user.phone,
      profileImage: user.profileImage ?? "",
    });
    setDirty(false);
    setSaved(false);
    setError(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {form.profileImage ? (
            <img src={form.profileImage} alt="Profilbild" className="size-16 rounded-full object-cover" />
          ) : (
            <div
              className="grid size-16 place-items-center rounded-full font-mono text-lg font-bold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initialsOf({
                firstName: form.firstName,
                lastName: form.lastName,
                displayName: form.displayName,
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            Bild hochladen
          </button>
          {form.profileImage && (
            <button
              onClick={() => set("profileImage", "")}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              Entfernen
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickImage(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Vorname">
          <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="ipt" />
        </Field>
        <Field label="Nachname">
          <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="ipt" />
        </Field>
        <Field label="Anzeigename" className="sm:col-span-2">
          <input
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            className="ipt"
            placeholder={`${form.firstName} ${form.lastName}`}
          />
        </Field>
        <Field label="E-Mail (nur Anzeige)">
          <input type="email" value={user.email} readOnly className="ipt opacity-70" />
        </Field>
        <Field label="Telefon">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="ipt" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-secondary/20 p-3 sm:grid-cols-2">
        <ReadOnly label="Rolle" value={ROLE_LABEL[user.role]} />
        <ReadOnly label="Status" value={STATUS_LABEL[user.status]} />
      </div>

      <div className="rounded-lg border border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Lock className="size-3.5" /> E-Mail, Passwort & Rolle
        </p>
        <p className="mt-1">
          E-Mail und Passwort werden über die Anmeldeseite verwaltet. Rollenwechsel erfolgt durch
          einen System-Administrator im Reiter „Benutzerverwaltung".
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <footer className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {saved && (
          <span className="mr-auto flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" /> Profil gespeichert
          </span>
        )}
        <button
          onClick={cancel}
          disabled={!dirty || saving}
          className="rounded-md border border-border bg-secondary/40 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Speichert…" : "Profil speichern"}
        </button>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-medium">{value}</span>
    </div>
  );
}

/* ----------------------------- Verwaltung --------------------------------- */

function UserAdmin({
  users,
  loading,
  currentUserId,
  canManageRoles,
  onChanged,
}: {
  users: UserProfile[];
  loading: boolean;
  currentUserId: string;
  canManageRoles: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.displayName.localeCompare(b.displayName, "de")),
    [users],
  );

  async function run(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-xs text-info">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          Neue Benutzer registrieren sich über die Anmeldeseite. Rolle und Status weisen Sie hier
          zu. Löschen ist bewusst nicht vorgesehen — deaktivieren Sie Konten stattdessen über den
          Status „archiviert".
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-primary" />
          Benutzer ({users.length})
        </h3>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">E-Mail</th>
              <th className="px-3 py-2 text-left">Rolle</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Lädt Benutzer…
                </td>
              </tr>
            )}
            {!loading &&
              sorted.map((u) => {
                const isMe = u.id === currentUserId;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt="" className="size-7 rounded-full object-cover" />
                        ) : (
                          <div
                            className="grid size-7 place-items-center rounded-full font-mono text-[10px] font-bold text-primary-foreground"
                            style={{ background: "var(--gradient-primary)" }}
                          >
                            {initialsOf(u)}
                          </div>
                        )}
                        <span className="font-medium">
                          {u.displayName}
                          {isMe && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground">(Sie)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{u.email || "—"}</td>
                    <td className="px-3 py-2">
                      {canManageRoles ? (
                        <select
                          value={u.role}
                          disabled={busy}
                          onChange={(e) =>
                            run(u.id, () => svcSetUserRole(u.id, e.target.value as UserRole))
                          }
                          className="ipt h-7 py-0 text-xs"
                          title="Rolle ändern"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleStyle(u.role)}`}
                        >
                          {ROLE_LABEL[u.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle(u.status)}`}
                      >
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(u.id, () =>
                              svcSetUserStatus(u.id, u.status === "archived" ? "active" : "archived"),
                            )
                          }
                          title={u.status === "archived" ? "Reaktivieren" : "Archivieren"}
                          className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                        >
                          <Archive className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Keine Benutzer sichtbar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!canManageRoles && (
        <p className="text-[10px] text-muted-foreground">
          Rollenwechsel ist Systemadministratoren vorbehalten.
        </p>
      )}
    </div>
  );
}
