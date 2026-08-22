import { useEffect, useState } from "react";
import { useRefreshSignal } from "@/hooks/useRefreshSignal";
import {
  listAvkkPeopleDirectory,
  type AvkkPersonDirectoryEntry,
} from "@/lib/avkk/people-directory";

export function useAvkkPeopleDirectory(): {
  people: AvkkPersonDirectoryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [people, setPeople] = useState<AvkkPersonDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refreshGeneration = useRefreshSignal();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listAvkkPeopleDirectory()
      .then((rows) => {
        if (!cancelled) setPeople(rows);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setPeople([]);
          setError(cause instanceof Error ? cause.message : "Personenverzeichnis konnte nicht geladen werden.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick, refreshGeneration]);

  return { people, loading, error, refresh: () => setTick((n) => n + 1) };
}
