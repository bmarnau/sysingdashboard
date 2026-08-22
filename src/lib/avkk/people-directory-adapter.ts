import { supabase } from "@/integrations/supabase/client";

export interface AvkkPersonDirectoryRow {
  id: string;
  display_name: string;
  role: string | null;
  status: string;
}

/**
 * Provider-spezifischer Zugriff auf den minimalen AVKK-Personenvertrag.
 *
 * Dieser Adapter ist bewusst der einzige Personenverzeichnis-Baustein mit
 * direktem Supabase-Zugriff. Die Fachlogik bleibt dadurch provider-neutral.
 */
export async function fetchAvkkPeopleDirectoryRows(): Promise<AvkkPersonDirectoryRow[]> {
  // Die RPC wird mit der F-11-Migration eingefuehrt. Bis die generierten
  // Supabase-Typen nach Anwendung der Migration aktualisiert werden, wird nur
  // der Funktionsname an der generierten Signatur vorbei typisiert.
  const { data, error } = await supabase.rpc("avkk_people_directory" as never);
  if (error) throw error;

  return (data ?? []) as unknown as AvkkPersonDirectoryRow[];
}
