import React from 'react';

// ── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'danger' | 'info' | 'warn' | 'gray';

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: '#EAF3DE', color: '#27500A' },
  danger:  { background: '#FCEBEB', color: '#791F1F' },
  info:    { background: '#E6F1FB', color: '#0C447C' },
  warn:    { background: '#FAEEDA', color: '#633806' },
  gray:    { background: '#F1EFE8', color: '#444441' },
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 500,
      ...badgeStyles[variant],
    }}>
      {children}
    </span>
  );
}

export function BoolBadge({ value, trueLabel = '활성', falseLabel = '비활성' }: {
  value: boolean; trueLabel?: string; falseLabel?: string;
}) {
  return <Badge variant={value ? 'success' : 'gray'}>{value ? trueLabel : falseLabel}</Badge>;
}

// ── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div style={{
      background: 'var(--color-bg-secondary, #f5f5f3)',
      borderRadius: 8,
      padding: '1rem',
    }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #888)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-text-primary, #1a1a18)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary, #aaa)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  title?: string;
  children: React.ReactNode;
  noPadding?: boolean;
  style?: React.CSSProperties;
}

export function Card({ title, children, noPadding, style }: CardProps) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: noPadding ? 0 : '1.25rem',
      overflow: noPadding ? 'hidden' : undefined,
      ...style,
    }}>
      {title && (
        <div style={{ marginBottom: '1rem', fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary, #1a1a18)' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────
export function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '6px 0',
      borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--color-text-secondary, #888)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%', color: 'var(--color-text-primary, #1a1a18)' }}>{value}</span>
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────
interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

export function DataTable<T>({ columns, data, onRowClick, emptyText = '데이터 없음' }: DataTableProps<T>) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{
              textAlign: 'left',
              padding: '8px 12px',
              color: 'var(--color-text-secondary, #888)',
              fontWeight: 500,
              borderBottom: '0.5px solid rgba(0,0,0,0.12)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              width: col.width,
            }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary, #aaa)', fontSize: 13 }}>{emptyText}</td></tr>
        ) : data.map((row, i) => (
          <tr key={i}
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = '#f9f9f7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
          >
            {columns.map(col => (
              <td key={col.key} style={{ padding: '10px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', color: 'var(--color-text-primary, #1a1a18)', verticalAlign: 'middle' }}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────
export function ScoreBar({ score }: { score: number }) {
  const color = score >= 4 ? '#639922' : score >= 2 ? '#BA7517' : '#E24B4A';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #888)', width: 50 }}>score: {score}</span>
      <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score * 20}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── UsageBar ──────────────────────────────────────────────────────────────────
export function UsageBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ width: 90, color: 'var(--color-text-secondary, #888)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: '#AFA9EC', borderRadius: 3 }} />
      </div>
      <span style={{ color: 'var(--color-text-secondary, #888)', minWidth: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
