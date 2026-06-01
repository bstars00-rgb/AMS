import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ClientRoom, MatchRow, MatchSettings } from "./types";
import type { MasterData } from "./lib/loaders";
import { runMatch, rescore, DEFAULT_SETTINGS } from "./lib/match";
import { loadSampleMaster, loadSampleClient } from "./lib/sample";

const KEY = "ams.match.session";

interface FileInfo {
  fileName: string;
  count: number;
}

interface Persisted {
  masterInfo: FileInfo | null;
  clientInfo: FileInfo | null;
  matches: MatchRow[];
  settings: MatchSettings;
}

interface StoreCtx {
  master: MasterData | null;
  masterInfo: FileInfo | null;
  clientRooms: ClientRoom[];
  clientInfo: FileInfo | null;
  matches: MatchRow[];
  settings: MatchSettings;
  hasMaster: boolean;
  hasClient: boolean;
  hasMatches: boolean;
  setMaster: (m: MasterData, fileName: string) => void;
  setClient: (rooms: ClientRoom[], fileName: string) => void;
  runMatching: () => number;
  updateRow: (id: string, patch: Partial<MatchRow>) => void;
  setSettings: (s: MatchSettings) => void;
  applyTuning: (s: MatchSettings) => void;
  loadSample: () => void;
  clearAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted;
      // Merge settings with defaults so older sessions gain new fields.
      parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { masterInfo: null, clientInfo: null, matches: [], settings: DEFAULT_SETTINGS };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [master, setMasterState] = useState<MasterData | null>(null);
  const [masterInfo, setMasterInfo] = useState<FileInfo | null>(initial.masterInfo);
  const [clientRooms, setClientRooms] = useState<ClientRoom[]>([]);
  const [clientInfo, setClientInfo] = useState<FileInfo | null>(initial.clientInfo);
  const [matches, setMatches] = useState<MatchRow[]>(initial.matches);
  const [settings, setSettingsState] = useState<MatchSettings>(initial.settings);

  // Persist the small/derived bits (not the big in-memory master inventory).
  useEffect(() => {
    const data: Persisted = { masterInfo, clientInfo, matches, settings };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* quota — ignore */
    }
  }, [masterInfo, clientInfo, matches, settings]);

  const setMaster = (m: MasterData, fileName: string) => {
    setMasterState(m);
    setMasterInfo({ fileName, count: m.rooms.length });
  };
  const setClient = (rooms: ClientRoom[], fileName: string) => {
    setClientRooms(rooms);
    setClientInfo({ fileName, count: rooms.length });
  };

  const runMatching = (): number => {
    if (!master || clientRooms.length === 0) return 0;
    const result = runMatch(clientRooms, master, settings);
    setMatches(result);
    return result.length;
  };

  const updateRow = (id: string, patch: Partial<MatchRow>) => {
    setMatches((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, ...patch, reviewedDate: patch.reviewedDate ?? r.reviewedDate ?? new Date().toISOString().slice(0, 10) }
          : r
      )
    );
  };

  const setSettings = (s: MatchSettings) => setSettingsState(s);

  // Live tuning: update settings and instantly re-score existing matches
  // from their stored sub-scores (no re-matching).
  const applyTuning = (s: MatchSettings) => {
    setSettingsState(s);
    setMatches((prev) => (prev.length ? rescore(prev, s) : prev));
  };

  const loadSample = () => {
    const m = loadSampleMaster();
    const c = loadSampleClient();
    setMaster(m, "sample_master.xlsx");
    setClient(c, "sample_unmapped.xlsx");
    setMatches(runMatch(c, m, settings));
  };

  const clearAll = () => {
    setMasterState(null);
    setMasterInfo(null);
    setClientRooms([]);
    setClientInfo(null);
    setMatches([]);
    setSettingsState(DEFAULT_SETTINGS);
    localStorage.removeItem(KEY);
  };

  return (
    <Ctx.Provider
      value={{
        master,
        masterInfo,
        clientRooms,
        clientInfo,
        matches,
        settings,
        hasMaster: !!master,
        hasClient: clientRooms.length > 0,
        hasMatches: matches.length > 0,
        setMaster,
        setClient,
        runMatching,
        updateRow,
        setSettings,
        applyTuning,
        loadSample,
        clearAll,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
