import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Check,
  Lock,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  ALL_ROLES,
  ALL_STATUSES,
  ROLE_LABEL,
  STATUS_LABEL,
  UserManagementService,
  initialsOf,
  type CreateUserInput,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from "@/lib/user-management";
import { useUsers } from "@/hooks/useCurrentUser";

type TabKey = "profil" | "wechseln" | "verwaltung";

export interface UserManagementDialogProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialTab?: TabKey;
  /** Wird aufgerufen, nachdem ein Profilwechsel erfolgte (Host lädt neu). */
  onProfileSwitch?: (newUserId: string) => void;
}

import { can, ROLE_PRIORITY } from "@/lib/rbac/permissions";

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
  onProfileSwitch,
}: UserManagementDialogProps) {
  const users = useUsers();
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
          <TabBtn active={tab === "wechseln"} onClick={() => setTab("wechseln")}>
            Profil wechseln
          </TabBtn>
          {canAdmin && (
            <TabBtn active={tab === "verwaltung"} onClick={() => setTab("verwaltung")}>
              Benutzerverwaltung
            </TabBtn>
          )}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "profil" && (
            <ProfileEditor
              user={currentUser}
              onSaved={() => {
                /* no-op, store push triggers re-render */
              }}
            />
          )}
          {tab === "wechseln" && (
            <ProfileSwitch
              users={users}
              currentUserId={currentUser.id}
              onSwitch={(id) => {
                UserManagementService.setActiveUserId(id);
                onProfileSwitch?.(id);
              }}
            />
          )}
          {tab === "verwaltung" && canAdmin && (
            <UserAdmin
              users={users}
              currentUserId={currentUser.id}
              canManageRoles={canManageRoles}
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
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage ?? "",
  });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset bei User-Wechsel
  useEffect(() => {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage ?? "",
    });
    setDirty(false);
    setSaved(false);
  }, [user.id]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setSaved(false);
  };

  const onPickImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 1024 * 1024) {
      alert("Bild ist zu groß (max. 1 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      set("profileImage", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert("Vor- und Nachname sind erforderlich.");
      return;
    }
    UserManagementService.updateUser(user.id, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      displayName: form.displayName.trim() || `${form.firstName.trim()} ${form.lastName.trim()}`,
      email: form.email.trim(),
      phone: form.phone.trim(),
      profileImage: form.profileImage || undefined,
    });
    setDirty(false);
    setSaved(true);
    onSaved();
  };

  const cancel = () => {
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage ?? "",
    });
    setDirty(false);
    setSaved(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {form.profileImage ? (
            <img
              src={form.profileImage}
              alt="Profilbild"
              className="size-16 rounded-full object-cover"
            />
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
          <input
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className="ipt"
          />
        </Field>
        <Field label="Nachname">
          <input
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className="ipt"
          />
        </Field>
        <Field label="Anzeigename" className="sm:col-span-2">
          <input
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            className="ipt"
            placeholder={`${form.firstName} ${form.lastName}`}
          />
        </Field>
        <Field label="E-Mail">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="ipt"
          />
        </Field>
        <Field label="Telefon">
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="ipt"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-secondary/20 p-3 sm:grid-cols-2">
        <ReadOnly label="Rolle" value={ROLE_LABEL[user.role]} />
        <ReadOnly label="Status" value={STATUS_LABEL[user.status]} />
      </div>

      <div className="rounded-lg border border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Lock className="size-3.5" /> Passwort & Multi-Faktor
        </p>
        <p className="mt-1">
          Passwortverwaltung und MFA werden mit der Aktivierung der echten Authentifizierung
          (Lovable Cloud, Microsoft Entra ID oder OAuth2) freigeschaltet. Aktuell ist kein Login
          aktiv.
        </p>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {saved && (
          <span className="mr-auto flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" /> Profil gespeichert
          </span>
        )}
        <button
          onClick={cancel}
          disabled={!dirty}
          className="rounded-md border border-border bg-secondary/40 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          onClick={save}
          disabled={!dirty}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Profil speichern
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

/* ---------------------------- Profil wechseln ----------------------------- */

function ProfileSwitch({
  users,
  currentUserId,
  onSwitch,
}: {
  users: UserProfile[];
  currentUserId: string;
  onSwitch: (id: string) => void;
}) {
  const usable = users.filter((u) => u.status === "active" || u.id === currentUserId);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          Entwicklungs-Modus: das Wechseln zwischen Profilen ist nur möglich, weil noch keine echte
          Anmeldung aktiv ist. Nach Aktivierung der Authentifizierung wird dies zum
          Admin-Impersonate-Feature.
        </p>
      </div>
      <ul className="space-y-2">
        {usable.map((u) => {
          const active = u.id === currentUserId;
          return (
            <li key={u.id}>
              <button
                onClick={() => {
                  if (active) return;
                  if (
                    !confirm(
                      `Auf Profil von ${u.displayName} wechseln?\n\nDie Seite wird neu geladen, damit alle Daten korrekt für diesen Benutzer geladen werden.`,
                    )
                  )
                    return;
                  onSwitch(u.id);
                }}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-secondary/30 hover:bg-secondary/60"
                }`}
              >
                {u.profileImage ? (
                  <img src={u.profileImage} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="grid size-10 place-items-center rounded-full font-mono text-xs font-bold text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {initialsOf(u)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABEL[u.role]} · {u.email || "ohne E-Mail"}
                  </p>
                </div>
                {active && (
                  <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Aktiv
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ----------------------------- Verwaltung --------------------------------- */

function UserAdmin({
  users,
  currentUserId,
  canManageRoles,
}: {
  users: UserProfile[];
  currentUserId: string;
  canManageRoles: boolean;
}) {
  const [editing, setEditing] = useState<UserProfile | "new" | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          Hinweis: Rollen- und Sichtbarkeitsprüfungen sind aktuell reine UI-Komfortfunktionen ohne
          Sicherheitsgarantie. Vertrauliche Daten erst nach Aktivierung der echten Authentifizierung
          speichern.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-primary" />
          Benutzer ({users.length})
        </h3>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <UserPlus className="size-3.5" /> Neuer Benutzer
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">E-Mail</th>
              <th className="px-3 py-2 text-left">Rolle</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {u.profileImage ? (
                      <img
                        src={u.profileImage}
                        alt=""
                        className="size-7 rounded-full object-cover"
                      />
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
                      {u.id === currentUserId && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">(Sie)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.email || "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleStyle(u.role)}`}
                  >
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle(u.status)}`}
                  >
                    {STATUS_LABEL[u.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditing(u)}
                      title="Bearbeiten"
                      className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (u.status === "archived") {
                          UserManagementService.setUserStatus(u.id, "active");
                        } else {
                          UserManagementService.setUserStatus(u.id, "archived");
                        }
                      }}
                      title={u.status === "archived" ? "Reaktivieren" : "Archivieren"}
                      className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Archive className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (u.id === currentUserId) {
                          alert("Sie können sich nicht selbst löschen.");
                          return;
                        }
                        if (
                          !confirm(
                            `${u.displayName} unwiderruflich löschen?\nAlle Daten (Projekte, Arbeitspakete, Tätigkeiten) dieses Benutzers werden ebenfalls entfernt.`,
                          )
                        )
                          return;
                        const res = UserManagementService.deleteUser(u.id);
                        if (!res.ok) alert(res.reason ?? "Löschen nicht möglich.");
                      }}
                      title="Löschen"
                      className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserEditor initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function UserEditor({ initial, onClose }: { initial: UserProfile | null; onClose: () => void }) {
  const [form, setForm] = useState<CreateUserInput>(() => ({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    displayName: initial?.displayName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    role: initial?.role ?? "engineer",
    status: initial?.status ?? "active",
  }));

  const save = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert("Vor- und Nachname sind erforderlich.");
      return;
    }
    if (initial) {
      UserManagementService.updateUser(initial.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName:
          (form.displayName ?? "").trim() || `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: (form.email ?? "").trim(),
        phone: (form.phone ?? "").trim(),
        role: form.role,
        status: form.status ?? "active",
      });
    } else {
      UserManagementService.createUser(form);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-elevated)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {initial ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {initial ? "Benutzer bearbeiten" : "Neuer Benutzer"}
          </h3>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Vorname">
            <input
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              className="ipt"
            />
          </Field>
          <Field label="Nachname">
            <input
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              className="ipt"
            />
          </Field>
          <Field label="Anzeigename" className="sm:col-span-2">
            <input
              value={form.displayName ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              className="ipt"
              placeholder={`${form.firstName} ${form.lastName}`}
            />
          </Field>
          <Field label="E-Mail">
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="ipt"
            />
          </Field>
          <Field label="Telefon">
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="ipt"
            />
          </Field>
          <Field label="Rolle">
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
              className="ipt"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status ?? "active"}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as UserStatus }))}
              className="ipt"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-secondary/40 px-4 py-2 text-sm"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {initial ? "Speichern" : "Anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
