import React, { useEffect, useState } from 'react';
import {
  User, Session, AffirmationDoc, JustificationDoc,
  subscribeUsers, subscribeAllSessions, subscribeAllAffirmation, subscribeAllJustification,
} from '../data/firestoreData';

// ── Design tokens (shared) ────────────────────────────────────────────────────
export const T = {
  radius: { sm: 6, md: 10, lg: 16 },
  font: {
    mono: "'IBM Plex Mono', 'Fira Code', 'Courier New', monospace",
    sans: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, -apple-system, sans-serif",
  },
  color: {
    bg: '#F7F6F3',
    surface: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.14)',
    text: '#18181B',
    textSub: '#52525B',
    textMuted: '#A1A1AA',
    accent: '#6152E8',
    accentLight: '#EEEEFF',
    success: '#16A34A',
    successLight: '#DCFCE7',
    warn: '#D97706',
    warnLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
  },
};

// ── App badge (shared) ────────────────────────────────────────────────────────
export function getAppStyle(app: string): { color: string; bg: string } {
  const n = (app ?? '').toLowerCase();
  if (n.includes('youtube')) return { color: '#fff', bg: '#FF0000' };
  if (n.includes('instagram')) return { color: '#fff', bg: '#D4470B' };
  if (n.includes('tiktok')) return { color: '#fff', bg: '#555558' };
  return { color: T.color.accent, bg: T.color.accentLight };
}

export function AppPill({ app }: { app: string }) {
  const { color, bg } = getAppStyle(app);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: T.font.sans, color, background: bg, whiteSpace: 'nowrap', width: 'fit-content' }}>
      {app}
    </span>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.color.text, margin: 0, fontFamily: T.font.sans, letterSpacing: '-0.02em' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: T.color.textMuted, marginTop: 4, marginBottom: 0, fontFamily: T.font.sans }}>{subtitle}</p>}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: T.color.textMuted, fontSize: 13, fontFamily: T.font.sans }}>
      불러오는 중...
    </div>
  );
}

function SurfaceCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {title && (
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.color.border}`, background: '#F9F9F7', fontSize: 12, fontWeight: 700, color: T.color.textSub, fontFamily: T.font.sans }}>
          {title}
        </div>
      )}
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.color.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.font.sans, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: T.color.text, fontFamily: T.font.sans, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.color.textMuted, marginTop: 5, fontFamily: T.font.sans }}>{sub}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.color.border}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: T.color.textMuted, fontFamily: T.font.sans }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.color.text, fontFamily: T.font.sans }}>{value}</span>
    </div>
  );
}

function UsageBarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  const { bg } = getAppStyle(label);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <AppPill app={label} />
      <div style={{ flex: 1, height: 6, background: T.color.border, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: bg === T.color.accentLight ? T.color.accent : bg, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.color.textSub, fontFamily: T.font.sans, minWidth: 24, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Overview Page ─────────────────────────────────────────────────────────────
export function OverviewPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<(Session & { userId: string; userName: string })[]>([]);
  const [affirmations, setAffirmations] = useState<(AffirmationDoc & { userId: string; userName: string })[]>([]);
  const [justifications, setJustifications] = useState<(JustificationDoc & { userId: string; userName: string })[]>([]);
  const [ready, setReady] = useState({ users: false, sessions: false, aff: false, just: false });

  useEffect(() => {
    const u1 = subscribeUsers(d => { setUsers(d); setReady(r => ({ ...r, users: true })); });
    const u2 = subscribeAllSessions(d => { setSessions(d); setReady(r => ({ ...r, sessions: true })); });
    const u3 = subscribeAllAffirmation(d => { setAffirmations(d); setReady(r => ({ ...r, aff: true })); });
    const u4 = subscribeAllJustification(d => { setJustifications(d); setReady(r => ({ ...r, just: true })); });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const loading = !ready.users || !ready.sessions || !ready.aff || !ready.just;
  if (loading) return <LoadingSpinner />;

  const affFinished = affirmations.filter(a => a.exit?.finished).length;
  const justFinished = justifications.filter(j => j.exit?.finished).length;
  const appCounts: Record<string, number> = {};
  sessions.forEach(s => { appCounts[s.app] = (appCounts[s.app] || 0) + 1; });
  const topApps = Object.entries(appCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = topApps[0]?.[1] || 1;
  const interventionActive = users.filter(u => u.interventionEnabled).length;
  const accessibilityActive = users.filter(u => u.accessibilityEnabled).length;

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Dashboard" subtitle="전체 사용자 및 데이터 현황" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <Metric label="전체 사용자" value={users.length} sub="활성 계정" />
        <Metric label="총 세션" value={sessions.length.toLocaleString()} sub="누적 기록" />
        <Metric label="Affirmation 완료" value={affFinished} sub="finished: true" />
        <Metric label="Justification 완료" value={justFinished} sub="finished: true" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <SurfaceCard title="앱 사용 현황">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topApps.length === 0
              ? <span style={{ fontSize: 13, color: T.color.textMuted }}>데이터 없음</span>
              : topApps.map(([app, count]) => <UsageBarRow key={app} label={app} value={count} max={maxCount} />)
            }
          </div>
        </SurfaceCard>
        <SurfaceCard title="Intervention 현황">
          <InfoRow label="Intervention 활성" value={`${interventionActive}명`} />
          <InfoRow label="Intervention 비활성" value={`${users.length - interventionActive}명`} />
          <InfoRow label="접근성 활성" value={`${accessibilityActive}명`} />
          <InfoRow label="총 Affirmation 세션" value={affirmations.length} />
          <InfoRow label="총 Justification 세션" value={justifications.length} />
        </SurfaceCard>
      </div>
    </div>
  );
}
