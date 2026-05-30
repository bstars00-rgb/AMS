import { NavLink, Outlet } from "react-router-dom";
import { useI18n, type Lang } from "../i18n";
import { useStore } from "../store";

const nav = [
  { to: "/", key: "nav.upload", end: true, icon: "⭱" },
  { to: "/review", key: "nav.review", icon: "▤" },
  { to: "/prompts", key: "nav.prompts", icon: "✦" },
  { to: "/export", key: "nav.export", icon: "⭳" },
];

function LangToggle() {
  const { lang, setLang, t } = useI18n();
  const opts: { v: Lang; key: string }[] = [
    { v: "ko", key: "lang.ko" },
    { v: "en", key: "lang.en" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => setLang(o.v)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            lang === o.v ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t(o.key)}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { t } = useI18n();
  const { fileName, hasResults, rows, clearAll } = useStore();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
            AMS
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-gray-900">{t("app.name")}</div>
            <div className="text-[11px] leading-tight text-gray-400">{t("app.full")}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`
              }
            >
              <span className="w-4 text-center text-gray-400">{n.icon}</span>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>

        {hasResults && (
          <div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400">
            <div className="truncate" title={fileName}>{fileName}</div>
            <div>{rows.length} {t("common.rows")}</div>
            <button onClick={clearAll} className="mt-2 text-red-500 hover:underline">
              {t("common.clear")}
            </button>
          </div>
        )}
        <div className="px-4 py-3 text-[11px] text-gray-300">v1.0 · no backend</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
          <div className="text-sm text-gray-400">{t("app.tagline")}</div>
          <LangToggle />
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
