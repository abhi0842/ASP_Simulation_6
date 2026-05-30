import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SimulationContext } from "./SimulationContext.jsx";
import {
  MAX_PINNED_RUNS,
  buildLmsMseActiveRun,
  buildMvdrBeamActiveRun,
  cloneAsPinnedRun,
  createEmptyCompareState,
} from "../utils/compareRuns.js";

export const CompareRunsContext = createContext(null);

export const CompareRunsProvider = ({ children }) => {
  const { algoResults } = useContext(SimulationContext);
  const [lmsArCompare, setLmsArCompare] = useState(createEmptyCompareState);
  const [mvdrCompare, setMvdrCompare] = useState(createEmptyCompareState);

  useEffect(() => {
    if (algoResults?.type !== "AR Process") return;
    const activeRun = buildLmsMseActiveRun(algoResults.data);
    setLmsArCompare((prev) => ({ ...prev, activeRun }));
  }, [algoResults]);

  useEffect(() => {
    if (algoResults?.type !== "MVDR Beamformer") return;
    const activeRun = buildMvdrBeamActiveRun(algoResults.data);
    setMvdrCompare((prev) => ({ ...prev, activeRun }));
  }, [algoResults]);

  const pinLmsRun = useCallback(() => {
    setLmsArCompare((prev) => {
      const pinned = cloneAsPinnedRun(prev.activeRun);
      if (!pinned) return prev;
      if (prev.pinnedRuns.length >= MAX_PINNED_RUNS) return prev;
      return { ...prev, pinnedRuns: [...prev.pinnedRuns, pinned] };
    });
  }, []);

  const clearLmsRuns = useCallback(() => {
    setLmsArCompare((prev) => ({ ...prev, pinnedRuns: [] }));
  }, []);

  const pinMvdrRun = useCallback(() => {
    setMvdrCompare((prev) => {
      const pinned = cloneAsPinnedRun(prev.activeRun);
      if (!pinned) return prev;
      if (prev.pinnedRuns.length >= MAX_PINNED_RUNS) return prev;
      return { ...prev, pinnedRuns: [...prev.pinnedRuns, pinned] };
    });
  }, []);

  const clearMvdrRuns = useCallback(() => {
    setMvdrCompare((prev) => ({ ...prev, pinnedRuns: [] }));
  }, []);

  const value = useMemo(
    () => ({
      lmsArCompare,
      mvdrCompare,
      pinLmsRun,
      clearLmsRuns,
      pinMvdrRun,
      clearMvdrRuns,
    }),
    [
      lmsArCompare,
      mvdrCompare,
      pinLmsRun,
      clearLmsRuns,
      pinMvdrRun,
      clearMvdrRuns,
    ]
  );

  return (
    <CompareRunsContext.Provider value={value}>
      {children}
    </CompareRunsContext.Provider>
  );
};

export function useCompareRuns() {
  const ctx = useContext(CompareRunsContext);
  if (!ctx) {
    throw new Error("useCompareRuns must be used within CompareRunsProvider");
  }
  return ctx;
}
