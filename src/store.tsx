import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AnalyzedRow, ColumnMap, ParsedFile } from "./types";
import { autoMap, applyMapping } from "./lib/columns";
import { analyzeAll } from "./lib/analysis";

const STORAGE_KEY = "ams.work";

interface Persisted {
  parsed: ParsedFile | null;
  columnMap: ColumnMap;
  rows: AnalyzedRow[];
  fileName: string;
}

interface StoreCtx extends Persisted {
  setParsedFile: (p: ParsedFile) => void;
  setColumnMap: (m: ColumnMap) => void;
  runAnalysis: () => number;
  updateRow: (id: number, patch: Partial<AnalyzedRow>) => void;
  attachPrompt: (id: number, prompt: string) => void;
  clearAll: () => void;
  hasResults: boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore */
  }
  return { parsed: null, columnMap: {}, rows: [], fileName: "" };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(load, []);
  const [parsed, setParsed] = useState<ParsedFile | null>(initial.parsed);
  const [columnMap, setColumnMapState] = useState<ColumnMap>(initial.columnMap);
  const [rows, setRows] = useState<AnalyzedRow[]>(initial.rows);
  const [fileName, setFileName] = useState<string>(initial.fileName);

  // Persist the whole working state so a refresh restores the session.
  useEffect(() => {
    const data: Persisted = { parsed, columnMap, rows, fileName };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota — ignore */
    }
  }, [parsed, columnMap, rows, fileName]);

  const setParsedFile = (p: ParsedFile) => {
    setParsed(p);
    setFileName(p.fileName);
    setColumnMapState(autoMap(p.headers));
  };

  const setColumnMap = (m: ColumnMap) => setColumnMapState(m);

  const runAnalysis = (): number => {
    if (!parsed) return 0;
    const raw = applyMapping(parsed, columnMap);
    const analyzed = analyzeAll(raw);
    setRows(analyzed);
    return analyzed.length;
  };

  const updateRow = (id: number, patch: Partial<AnalyzedRow>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              edited: true,
              reviewedDate: r.reviewedDate ?? new Date().toISOString().slice(0, 10),
            }
          : r
      )
    );
  };

  const attachPrompt = (id: number, prompt: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, aiPrompt: prompt } : r)));
  };

  const clearAll = () => {
    setParsed(null);
    setColumnMapState({});
    setRows([]);
    setFileName("");
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Ctx.Provider
      value={{
        parsed,
        columnMap,
        rows,
        fileName,
        setParsedFile,
        setColumnMap,
        runAnalysis,
        updateRow,
        attachPrompt,
        clearAll,
        hasResults: rows.length > 0,
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
