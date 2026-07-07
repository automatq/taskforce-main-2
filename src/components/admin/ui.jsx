// Glassmorphic admin design system — small, reusable primitives. Dark is the
// default; every color pairs a light-mode class with a `dark:` variant so the
// whole admin console follows the theme toggle in the account menu.
// Accents: sky (primary), emerald (positive), amber (pending), rose (negative).

export function Icon({ name, className = '' }) {
  // iconify-icon renders at 1em, so font-size (text-*) controls the glyph size
  // and text color controls the glyph color.
  return (
    <span className={`inline-flex items-center justify-center leading-none ${className}`}>
      <iconify-icon icon={name}></iconify-icon>
    </span>
  );
}

export function GlassCard({ className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

const ACCENTS = {
  sky: 'text-sky-600 dark:text-sky-300 bg-sky-500/10 ring-sky-500/20 dark:ring-sky-400/20',
  emerald: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 ring-emerald-500/20 dark:ring-emerald-400/20',
  amber: 'text-amber-600 dark:text-amber-300 bg-amber-500/10 ring-amber-500/20 dark:ring-amber-400/20',
  violet: 'text-violet-600 dark:text-violet-300 bg-violet-500/10 ring-violet-500/20 dark:ring-violet-400/20',
  rose: 'text-rose-600 dark:text-rose-300 bg-rose-500/10 ring-rose-500/20 dark:ring-rose-400/20',
  zinc: 'text-zinc-600 dark:text-zinc-300 bg-zinc-950/5 dark:bg-white/5 ring-zinc-950/10 dark:ring-white/10',
};

export function StatCard({ label, value, icon, accent = 'sky', sub }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium">{label}</p>
        {icon && (
          <span className={`grid place-items-center h-8 w-8 rounded-lg ring-1 ${ACCENTS[accent]}`}>
            <Icon name={icon} className="text-base" />
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </GlassCard>
  );
}

// ---- Status + score chips ----------------------------------------------------
const STATUS_COLORS = {
  // applicant pipeline
  new: 'sky', reviewing: 'amber', interviewing: 'violet', hired: 'emerald', rejected: 'rose',
  // jobs
  active: 'emerald', closed: 'zinc', draft: 'amber',
  // invoices
  paid: 'emerald', sent: 'sky', overdue: 'rose',
  // employer plans
  Pro: 'sky', Basic: 'zinc', Trial: 'amber',
  // agents
  setup: 'amber', connect: 'sky',
  // timesheets
  submitted: 'amber', approved: 'emerald', invoiced: 'sky',
  // team roles + account status
  owner: 'violet', recruiter: 'sky', viewer: 'zinc', inactive: 'zinc',
  // job positions
  filled: 'emerald',
};

export function StatusBadge({ status }) {
  const accent = STATUS_COLORS[status] || 'zinc';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ring-1 ${ACCENTS[accent]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

export function ScoreChip({ score, error }) {
  if (score == null && error) {
    return (
      <span title={error} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${ACCENTS.rose}`}>
        <Icon name="solar:danger-triangle-bold" className="text-[11px]" />
        Failed
      </span>
    );
  }
  if (score == null) return <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>;
  const accent = score >= 90 ? 'emerald' : score >= 80 ? 'sky' : score >= 70 ? 'amber' : 'rose';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ring-1 ${ACCENTS[accent]}`}>
      <Icon name="solar:magic-stick-3-bold" className="text-[11px]" />
      {score}
      {error && <Icon name="solar:danger-triangle-bold" className="text-[11px] text-rose-600 dark:text-rose-300" title={`Last re-score failed: ${error}`} />}
    </span>
  );
}

// ---- Buttons -----------------------------------------------------------------
export function Button({ variant = 'primary', className = '', icon, children, ...rest }) {
  const styles = {
    primary: 'bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] shadow-[0_4px_20px_-6px_rgba(14,165,233,0.6)]',
    ghost: 'bg-zinc-950/5 text-zinc-700 hover:bg-zinc-950/10 ring-1 ring-zinc-950/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10 dark:ring-white/10',
    danger: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 ring-1 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 dark:ring-rose-400/20',
    subtle: 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5',
  };
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${styles[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} className="text-base" />}
      {children}
    </button>
  );
}

export function IconButton({ icon, title, variant = 'subtle', ...rest }) {
  const styles = {
    subtle: 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-950/10 dark:hover:text-white dark:hover:bg-white/10',
    danger: 'text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-300',
  };
  return (
    <button title={title} className={`grid place-items-center h-9 w-9 rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30 ${styles[variant]}`} {...rest}>
      <Icon name={icon} className="text-lg" />
    </button>
  );
}

// ---- Form controls -----------------------------------------------------------
const fieldBase =
  'w-full rounded-xl bg-zinc-950/[0.04] border border-zinc-950/10 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-sky-500/50 focus:bg-zinc-950/[0.06] dark:bg-white/[0.04] dark:border-white/10 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-sky-400/50 dark:focus:bg-white/[0.06]';

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-zinc-400 dark:text-zinc-600">{hint}</span>}
    </label>
  );
}

export function Input(props) {
  return <input {...props} className={`${fieldBase} ${props.className || ''}`} />;
}
export function Textarea(props) {
  return <textarea {...props} className={`${fieldBase} resize-y ${props.className || ''}`} />;
}
export function Select(props) {
  return (
    <select {...props} className={`${fieldBase} appearance-none ${props.className || ''}`}>
      {props.children}
    </select>
  );
}

// ---- Slide-over drawer -------------------------------------------------------
export function Drawer({ open, onClose, title, children, width = 'max-w-xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} h-full overflow-y-auto border-l border-zinc-200 bg-white/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-[slideIn_.25s_ease]`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-zinc-950/80">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h2>
          <IconButton icon="solar:close-circle-linear" title="Close" onClick={onClose} />
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ---- Misc --------------------------------------------------------------------
export function Spinner({ className = '' }) {
  return <div className={`h-6 w-6 animate-spin rounded-full border-2 border-zinc-950/15 border-t-sky-500 dark:border-white/15 dark:border-t-sky-400 ${className}`} />;
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-zinc-950/10 bg-zinc-950/[0.04] px-3.5 py-2 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.04]">
      <Icon name="solar:magnifer-linear" className="text-base" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-44 bg-transparent text-zinc-800 placeholder:text-zinc-400 outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300">
          <Icon name="solar:close-circle-bold" className="text-sm" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'solar:inbox-linear', title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="grid place-items-center h-14 w-14 rounded-2xl bg-zinc-950/5 ring-1 ring-zinc-950/10 text-zinc-500 dark:bg-white/5 dark:ring-white/10">
        <Icon name={icon} className="text-2xl" />
      </span>
      <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Generic table shell to keep section tables consistent.
export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-[0.12em] text-zinc-500 dark:border-white/10">
            {columns.map((c, i) => (
              <th key={i} className={`px-5 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">{children}</tbody>
      </table>
    </div>
  );
}

export function money(n) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n || 0);
}

export function relativeDate(s) {
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-CA');
}
