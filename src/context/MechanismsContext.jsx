import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchApprovedMechanisms, fetchPendingMechanisms, syncLocalMechanismsToSupabase } from "../tom/tomApi.js";
import { normalizeMechanism, normalizeMechanisms } from "../tom/mechanismUtils.js";

const MechanismsContext = createContext(null);

/**
 * Single source-of-truth for mechanisms data.
 * Fetches once on mount; children consume via useMechanisms().
 * Automatically syncs any unsynced local drafts to Supabase when connected.
 */
export function MechanismsProvider({ children }) {
  const [mechanisms, setMechanisms] = useState(() => normalizeMechanisms([]));
  const [pendingMechanisms, setPendingMechanisms] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      // Opportunistically sync any local items to Supabase
      await syncLocalMechanismsToSupabase().catch(() => {});
      const [appRes, pendRes] = await Promise.all([
        fetchApprovedMechanisms(),
        fetchPendingMechanisms(),
      ]);
      if (appRes?.data) setMechanisms(normalizeMechanisms(appRes.data));
      if (pendRes?.data) setPendingMechanisms(pendRes.data.map(normalizeMechanism));
    } catch (err) {
      console.error("Error refreshing mechanisms:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await syncLocalMechanismsToSupabase().catch(() => {});
      } catch {
        // ignore
      }
      Promise.all([fetchApprovedMechanisms(), fetchPendingMechanisms()])
        .then(([appRes, pendRes]) => {
          if (!active) return;
          if (appRes?.data) setMechanisms(normalizeMechanisms(appRes.data));
          if (pendRes?.data) setPendingMechanisms(pendRes.data.map(normalizeMechanism));
          setLoading(false);
        })
        .catch(() => {
          if (active) setLoading(false);
        });
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <MechanismsContext.Provider value={{ mechanisms, pendingMechanisms, loading, refreshData }}>
      {children}
    </MechanismsContext.Provider>
  );
}

/** Hook to consume mechanism data from anywhere in the tree. */
export function useMechanisms() {
  const ctx = useContext(MechanismsContext);
  if (!ctx) throw new Error("useMechanisms must be used within a MechanismsProvider");
  return ctx;
}
