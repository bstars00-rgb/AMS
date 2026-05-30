import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import type { Level, ActionKey } from "../types";

const levelColor: Record<Level, string> = {
  HIGH: "bg-red-50 text-red-700 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-green-50 text-green-700 border-green-200",
};
const levelDot: Record<Level, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-green-500",
};

export function LevelBadge({ level }: { level: Level }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${levelColor[level]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${levelDot[level]}`} />
      {t(`level.${level}`)}
    </span>
  );
}

const actionColor: Record<ActionKey, string> = {
  PROCEED_MAPPING: "bg-green-50 text-green-700 border-green-200",
  NO_ACTION_NEEDED: "bg-gray-100 text-gray-600 border-gray-200",
  NEED_HOTEL_REVIEW: "bg-blue-50 text-blue-700 border-blue-200",
  NEED_ROOM_REVIEW: "bg-blue-50 text-blue-700 border-blue-200",
  NEED_STAKEHOLDER_CONFIRMATION: "bg-purple-50 text-purple-700 border-purple-200",
  REQUEST_AGENT_AMENDMENT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  REQUEST_NEW_HOTEL_CREATION: "bg-orange-50 text-orange-700 border-orange-200",
  REQUEST_NEW_ROOM_CREATION: "bg-orange-50 text-orange-700 border-orange-200",
};

export function ActionBadge({ action }: { action: ActionKey }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${actionColor[action]}`}>
      {t(`action.${action}`)}
    </span>
  );
}

export function YesNo({ value }: { value: boolean }) {
  const { t } = useI18n();
  return value ? (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      {t("common.yes")}
    </span>
  ) : (
    <span className="text-xs text-gray-400">{t("common.no")}</span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-2 text-3xl text-gray-300">⬚</div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
