import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { readWorkbook, loadMaster, loadClient } from "../lib/loaders";
import { PageHeader } from "../components/ui";

function DropZone({ title, hint, loaded, onFile, error }: {
  title: string; hint: string; loaded?: string; error?: string; onFile: (f: File) => void;
}) {
  const { t } = useI18n();
  const [over, setOver] = useState(false);
  return (
    <div className="card p-5">
      <div className="mb-1 text-sm font-semibold text-gray-800">{title}</div>
      <p className="mb-3 text-xs text-gray-500">{hint}</p>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
          over ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400"
        }`}
      >
        <span className="text-2xl text-gray-300">⭱</span>
        <span className="mt-1 text-xs text-gray-600">{t("load.drop")}</span>
        <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>
      {loaded && <p className="mt-2 text-xs font-medium text-green-700">✓ {loaded}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function Load() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { masterInfo, clientInfo, hasMaster, hasClient, setMaster, setClient, runMatching, loadSample, settings, setSettings } = useStore();
  const [mErr, setMErr] = useState<string>();
  const [cErr, setCErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  const onMaster = async (f: File) => {
    setMErr(undefined); setBusy(true);
    try { setMaster(loadMaster(await readWorkbook(f)), f.name); }
    catch { setMErr(t("load.parseError")); }
    finally { setBusy(false); }
  };
  const onClient = async (f: File) => {
    setCErr(undefined); setBusy(true);
    try { setClient(loadClient(await readWorkbook(f)), f.name); }
    catch { setCErr(t("load.parseError")); }
    finally { setBusy(false); }
  };

  const run = () => {
    const n = runMatching();
    if (n > 0) navigate("/review");
  };

  return (
    <div>
      <PageHeader
        title={t("load.title")}
        subtitle={t("load.subtitle")}
        actions={<button className="btn-ghost" onClick={() => { loadSample(); navigate("/review"); }}>{t("load.sample")}</button>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DropZone title={t("load.master")} hint={t("load.masterHint")} error={mErr}
          loaded={masterInfo ? `${masterInfo.fileName} — ${masterInfo.count} ${t("load.rooms")}` : undefined}
          onFile={onMaster} />
        <DropZone title={t("load.client")} hint={t("load.clientHint")} error={cErr}
          loaded={clientInfo ? `${clientInfo.fileName} — ${clientInfo.count} ${t("load.rooms")}` : undefined}
          onFile={onClient} />
      </div>

      <div className="card mt-5 p-5">
        <div className="text-sm font-semibold text-gray-800">{t("load.settings")}</div>
        <div className="mt-3 flex flex-wrap items-end gap-6">
          <label className="text-xs text-gray-600">
            <span className="mb-1 block">{t("load.autoTh")}</span>
            <input type="number" min={0} max={100} className="input w-24"
              value={settings.autoThreshold}
              onChange={(e) => setSettings({ ...settings, autoThreshold: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-gray-600">
            <span className="mb-1 block">{t("load.reviewTh")}</span>
            <input type="number" min={0} max={100} className="input w-24"
              value={settings.reviewThreshold}
              onChange={(e) => setSettings({ ...settings, reviewThreshold: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-gray-600">
            <span className="mb-1 block">{t("load.channel")}</span>
            <input className="input w-40" placeholder="Agoda" title={t("load.channelHint")}
              value={settings.clientChannel}
              onChange={(e) => setSettings({ ...settings, clientChannel: e.target.value })} />
          </label>
          <button className="btn-primary ml-auto" disabled={!hasMaster || !hasClient || busy} onClick={run}>
            {t("load.run")}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={settings.excludeCircular}
            onChange={(e) => setSettings({ ...settings, excludeCircular: e.target.checked })} />
          {t("load.excludeCircular")}
        </label>
        {(!hasMaster || !hasClient) && <p className="mt-3 text-xs text-gray-400">{t("load.needBoth")}</p>}
      </div>
    </div>
  );
}
