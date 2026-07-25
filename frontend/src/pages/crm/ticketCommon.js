// Shared components used by CRM Ticket pages (Broadband + Dedicated)
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, PlayCircle, Search as SearchIcon, Eye, ShieldAlert, XCircle, MessageSquare, Wrench, HelpCircle } from 'lucide-react';

export const BROADBAND_STATUSES = ['Open', 'Progress', 'Monitoring', 'Resolved', 'Closed'];
export const DEDICATED_STATUSES = ['Open', 'Investigation', 'Provider Coordination', 'Monitoring', 'Resolved', 'Closed'];

export const STATUS_STYLES = {
  Open: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  Progress: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
  Investigation: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30',
  'Provider Coordination': 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  Monitoring: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  Resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  Closed: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30',
};

export function TicketStatusBadge({ value }) {
  const style = STATUS_STYLES[value] || STATUS_STYLES.Closed;
  return <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-md', style)}>{value}</span>;
}

const STATUS_ICON = {
  Open: Circle,
  Progress: PlayCircle,
  Investigation: SearchIcon,
  'Provider Coordination': MessageSquare,
  Monitoring: Eye,
  Resolved: CheckCircle2,
  Closed: XCircle,
};

/**
 * Renders a horizontal workflow tracker.
 * Props:
 *   - statuses: ordered array of allowed statuses for this ticket type
 *   - current: current status value
 *   - onSet: (status) => void (optional; if provided, becomes clickable)
 */
export function WorkflowTracker({ statuses, current, onSet }) {
  const currentIdx = statuses.indexOf(current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {statuses.map((s, i) => {
        const Icon = STATUS_ICON[s] || Circle;
        const done = i < currentIdx;
        const isCur = i === currentIdx;
        return (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => onSet && onSet(s)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium shrink-0 transition-colors',
                done && 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
                isCur && 'bg-primary text-primary-foreground border-primary',
                !done && !isCur && 'bg-background text-muted-foreground border-border hover:bg-accent'
              )}
              data-testid={`workflow-step-${s.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-3 h-3" />
              {s}
            </button>
            {i < statuses.length - 1 && <div className={cn('h-0.5 w-4 rounded-full shrink-0', done ? 'bg-emerald-500/60' : 'bg-border')} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * SLA countdown: given open_time (iso) and target minutes, returns { label, color, over }.
 */
export function slaInfo(openTime, targetMinutes, closed) {
  if (!targetMinutes || !openTime) return null;
  const t0 = new Date(openTime).getTime();
  if (Number.isNaN(t0)) return null;
  const now = Date.now();
  const elapsedMin = (now - t0) / 60000;
  const remain = targetMinutes - elapsedMin;
  if (closed) return { label: 'Closed', color: 'text-muted-foreground', over: false };
  if (remain < 0) return { label: `Over ${Math.floor(-remain)} min`, color: 'text-rose-600 dark:text-rose-400', over: true };
  if (remain < 30) return { label: `${Math.floor(remain)} min left`, color: 'text-amber-600 dark:text-amber-400', over: false };
  return { label: `${Math.floor(remain)} min left`, color: 'text-emerald-600 dark:text-emerald-400', over: false };
}

export function nowLocalIso() {
  // Return YYYY-MM-DDTHH:mm (for datetime-local inputs)
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
