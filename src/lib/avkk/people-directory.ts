import { fetchAvkkPeopleDirectoryRows } from "./people-directory-adapter";

export interface AvkkPersonDirectoryEntry {
  id: string;
  displayName: string;
  role: string | null;
  status: string;
}

/**
 * Liest den minimalen AVKK-Personenvertrag ueber den Provider-Adapter.
 *
 * Der Server entscheidet anhand der RBAC-Berechtigungen, welche Personen
 * sichtbar sind. Der Fachservice erhaelt bewusst keine vollstaendigen Profile
 * und kennt keine Supabase-spezifische Implementierung.
 */
export async function listAvkkPeopleDirectory(): Promise<AvkkPersonDirectoryEntry[]> {
  const rows = await fetchAvkkPeopleDirectoryRows();

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name || "Unbenannt",
    role: row.role,
    status: row.status,
  }));
}
