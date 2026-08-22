import { supabase } from "@/integrations/supabase/client";

export interface AvkkPersonDirectoryEntry {
  id: string;
  displayName: string;
  role: string | null;
  status: string;
}

type AvkkPersonDirectoryRow = {
  id: string;
  display_name: string;
  role: string | null;
  status: string;
};

/**
 * Liest den minimalen AVKK-Personenvertrag aus Supabase.
 *
 * Der Server entscheidet anhand der RBAC-Berechtigungen, welche Personen
 * sichtbar sind. Der Client erhaelt bewusst keine vollstaendigen Profile.
 */
export async function listAvkkPeopleDirectory(): Promise<AvkkPersonDirectoryEntry[]> {
  // Die RPC wird mit dieser Migration eingefuehrt. Bis die generierten
  // Supabase-Typen nach Anwendung der Migration aktualisiert werden, wird nur
  // der Funktionsname an der generierten Signatur vorbei typisiert; die
  // Rueckgabe wird unten explizit validiert/gemappt.
  const { data, error } = await supabase.rpc("avkk_people_directory" as never);
  if (error) throw error;

  return ((data ?? []) as unknown as AvkkPersonDirectoryRow[]).map((row) => ({
    id: row.id,
    displayName: row.display_name || "Unbenannt",
    role: row.role,
    status: row.status,
  }));
}
