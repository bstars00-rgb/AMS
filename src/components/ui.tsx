import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import type { Band, RowStatus } from "../types";

const bandColor: Record<Band, string> = {
  AUTO: "bg-green-50 text-green-700 border-green-200",
  REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  NOMATCH: "bg-red-50 text-red-700 border-red-200",
};
export function BandBadge({ band }: { band: Band }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${bandColor[band]}`}>
      {t(`band.${band}`)}
    </span>
  );
}

const statusColor: Record<RowStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
  CONFIRMED: "bg-green-50 text-green-700 border-green-200",
  NEED_CREATION: "bg-orange-50 text-orange-700 border-orange-200",
  WEBSITE_CHECK: "bg-purple-50 text-purple-700 border-purple-200",
};
export function StatusBadge({ status }: { status: RowStatus }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor[status]}`}>
      {t(`status.${status}`)}
    </span>
  );
}

export function ScorePill({ score }: { score: number }) {
  const color =
    score >= 90 ? "bg-green-100 text-green-700" : score >= 65 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
  return <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${color}`}>{score}%</span>;
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
