import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader, LoadingSpinner, LastUpdated, T, AppPill, usePolling } from './OverviewPage';
import {
  Session, AffirmationDoc, JustificationDoc,
  fetchAllSessions, fetchAllBlocking, fetchAllAffirmation, fetchAllJustification, fmtSec,
} from '../data/firestoreData';

// ── Shared primitives ─────────────────────────────────────────────────────────
function Pill({ children, color = T.color.textSub, bg = 'rgba(0,0,0,0.06)' }: {
  children: React.ReactNode; color?: string; bg?: string;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 500, fontFamily: T.font.sans, color, background: bg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function BoolPill({ value, trueLabel = 'true', falseLabel = 'false' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return <Pill color={value ? T.color.success : T.color.warn} bg={value ? T.color.successLight : T.color.warnLight}>{value ? trueLabel : falseLabel}</Pill>;
}

function ColHeader({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color: T.color.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: T.font.sans, whiteSpace: 'nowrap' }}>{children}</span>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.color.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.font.sans, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: T.color.text, fontFamily: T.font.sans, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function TableContainer({ children }: { children: React.ReactNode }) {
  return <div style={{ background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>{children}</div>;
}

function EmptyState({ message }: { message: string }) {
  return <div style={{ padding: '48px', textAlign: 'center', color: T.color.textMuted, fontSize: 13, fontFamily: T.font.sans }}>{message}</div>;
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export function SessionsPage() {
  const [sessions, setSessions] = useState<(Session & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    const s = await fetchAllSessions();
    setSessions(s); setLoading(false); setRefreshing(false);
    setLastUpdated(new Date());
  }, []);

  usePolling(() => load(false));

  if (loading) return <LoadingSpinner />;

  const total = sessions.length;
  const avgSec = total > 0 ? Math.round(sessions.reduce((s, r) => s + r.durationSec, 0) / total) : 0;
  const appCounts: Record<string, number> = {};
  sessions.forEach(s => { appCounts[s.app] = (appCounts[s.app] || 0) + 1; });
  const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const COLS = '1.2fr 120px 1fr 1fr 1fr 1fr';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Sessions" subtitle="sessions 컬렉션 전체 데이터" onRefresh={() => load(true)} refreshing={refreshing} />
      <LastUpdated time={lastUpdated} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <Metric label="총 세션" value={total.toLocaleString()} />
        <Metric label="평균 사용시간" value={fmtSec(avgSec)} />
        <Metric label="총 사용자" value={new Set(sessions.map(s => s.userId)).size} />
        <Metric label="최다 앱" value={<AppPill app={topApp} />} />
      </div>

      <TableContainer>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '9px 20px', gap: 12, background: '#F4F4F2', borderBottom: `1px solid ${T.color.border}` }}>
          {['사용자', '앱', '날짜', '시작', '종료', '사용시간'].map(h => <ColHeader key={h}>{h}</ColHeader>)}
        </div>
        {sessions.length === 0 && <EmptyState message="세션 없음" />}
        {sessions.map((s, i) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '11px 20px', alignItems: 'center', gap: 12, borderBottom: i < sessions.length - 1 ? `1px solid ${T.color.border}` : 'none' }}>
            <span style={{ fontSize: 12, color: T.color.textSub, fontFamily: T.font.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.userName}</span>
            <AppPill app={s.app} />
            <span style={{ fontSize: 12, color: T.color.text, fontFamily: T.font.sans }}>{s.day}</span>
            <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub }}>{s.startTime}</span>
            <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub }}>{s.endTime || '—'}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.color.text, fontFamily: T.font.sans }}>{fmtSec(s.durationSec)}</span>
          </div>
        ))}
      </TableContainer>
    </div>
  );
}

// ── Blocking ──────────────────────────────────────────────────────────────────
export function BlockingPage() {
  const [docs, setDocs] = useState<{ id: string; userId: string; userName: string; updatedAt: string; messages: any[]; exit: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    const d = await fetchAllBlocking();
    setDocs(d); setLoading(false); setRefreshing(false);
    setLastUpdated(new Date());
  }, []);

  usePolling(() => load(false));

  if (loading) return <LoadingSpinner />;

  const COLS = '1.2fr 1.8fr 80px 100px 1fr';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Blocking" subtitle="blocking 컬렉션 전체 데이터" onRefresh={() => load(true)} refreshing={refreshing} />
      <LastUpdated time={lastUpdated} />

      <TableContainer>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '9px 20px', gap: 12, background: '#F4F4F2', borderBottom: `1px solid ${T.color.border}` }}>
          {['사용자', 'Document ID', '메시지', '완료', '업데이트'].map(h => <ColHeader key={h}>{h}</ColHeader>)}
        </div>
        {docs.length === 0 && <EmptyState message="Blocking 데이터 없음" />}
        {docs.map((b, i) => (
          <div key={b.id} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '11px 20px', alignItems: 'center', gap: 12, borderBottom: i < docs.length - 1 ? `1px solid ${T.color.border}` : 'none' }}>
            <span style={{ fontSize: 12, color: T.color.textSub, fontFamily: T.font.sans }}>{b.userName}</span>
            <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.id}</span>
            <Pill>{b.messages.length}개</Pill>
            {b.exit ? <BoolPill value={b.exit.finished} trueLabel="완료" falseLabel="미완료" /> : <span style={{ color: T.color.textMuted, fontSize: 12 }}>—</span>}
            <span style={{ fontSize: 11, color: T.color.textMuted, fontFamily: T.font.sans }}>{b.updatedAt}</span>
          </div>
        ))}
      </TableContainer>
    </div>
  );
}

// ── Affirmation ───────────────────────────────────────────────────────────────
export function AffirmationPage() {
  const [docs, setDocs] = useState<(AffirmationDoc & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    const d = await fetchAllAffirmation();
    setDocs(d); setLoading(false); setRefreshing(false);
    setLastUpdated(new Date());
  }, []);

  usePolling(() => load(false));

  if (loading) return <LoadingSpinner />;

  const finished = docs.filter(a => a.exit?.finished).length;
  const methods: Record<string, number> = {};
  docs.forEach(a => { if (a.exit?.method) methods[a.exit.method] = (methods[a.exit.method] || 0) + 1; });
  const COLS = '1.2fr 1.8fr 80px 100px 120px 1fr';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Affirmation" subtitle="affirmation 컬렉션 전체 데이터" onRefresh={() => load(true)} refreshing={refreshing} />
      <LastUpdated time={lastUpdated} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <Metric label="총 세션" value={docs.length} />
        <Metric label="완료(finished)" value={finished} />
        <Metric label="Exit: COMPLETE" value={methods['COMPLETE'] ?? 0} />
        <Metric label="Exit: BACKGROUND" value={methods['BACKGROUND'] ?? 0} />
      </div>

      <TableContainer>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '9px 20px', gap: 12, background: '#F4F4F2', borderBottom: `1px solid ${T.color.border}` }}>
          {['사용자', 'Document ID', '메시지', '완료', 'Exit', '시각'].map(h => <ColHeader key={h}>{h}</ColHeader>)}
        </div>
        {docs.length === 0 && <EmptyState message="Affirmation 데이터 없음" />}
        {docs.map((a, i) => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '11px 20px', alignItems: 'center', gap: 12, borderBottom: i < docs.length - 1 ? `1px solid ${T.color.border}` : 'none' }}>
            <span style={{ fontSize: 12, color: T.color.textSub, fontFamily: T.font.sans }}>{a.userName}</span>
            <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.id}</span>
            <Pill>{a.messages.length}개</Pill>
            {a.exit ? <BoolPill value={a.exit.finished} trueLabel="완료" falseLabel="미완료" /> : <span style={{ color: T.color.textMuted, fontSize: 12 }}>—</span>}
            {a.exit ? <Pill color={T.color.accent} bg={T.color.accentLight}>{a.exit.method}</Pill> : <span style={{ color: T.color.textMuted, fontSize: 12 }}>—</span>}
            <span style={{ fontSize: 11, color: T.color.textMuted, fontFamily: T.font.mono }}>{a.exit?.at ?? '—'}</span>
          </div>
        ))}
      </TableContainer>
    </div>
  );
}

// ── Justification ─────────────────────────────────────────────────────────────
export function JustificationPage() {
  const [docs, setDocs] = useState<(JustificationDoc & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    const d = await fetchAllJustification();
    setDocs(d); setLoading(false); setRefreshing(false);
    setLastUpdated(new Date());
  }, []);

  usePolling(() => load(false));

  if (loading) return <LoadingSpinner />;

  const finished = docs.filter(j => j.exit?.finished).length;
  const allMessages = docs.flatMap(j => j.messages);
  const passCount = allMessages.filter(m => m.score === true).length;
  const methods: Record<string, number> = {};
  docs.forEach(j => { if (j.exit?.method) methods[j.exit.method] = (methods[j.exit.method] || 0) + 1; });
  const COLS = '1.2fr 1.8fr 80px 100px 110px 120px';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Justification" subtitle="justification 컬렉션 전체 데이터" onRefresh={() => load(true)} refreshing={refreshing} />
      <LastUpdated time={lastUpdated} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <Metric label="총 세션" value={docs.length} />
        <Metric label="완료(finished)" value={finished} />
        <Metric label="score: true" value={passCount} />
        <Metric label="Exit: BACKGROUND" value={methods['BACKGROUND'] ?? 0} />
      </div>

      <TableContainer>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '9px 20px', gap: 12, background: '#F4F4F2', borderBottom: `1px solid ${T.color.border}` }}>
          {['사용자', 'Document ID', '메시지', '완료', 'score true', 'Exit'].map(h => <ColHeader key={h}>{h}</ColHeader>)}
        </div>
        {docs.length === 0 && <EmptyState message="Justification 데이터 없음" />}
        {docs.map((j, i) => {
          const pass = j.messages.filter(m => m.score === true).length;
          const total = j.messages.length;
          return (
            <div key={j.id} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '11px 20px', alignItems: 'center', gap: 12, borderBottom: i < docs.length - 1 ? `1px solid ${T.color.border}` : 'none' }}>
              <span style={{ fontSize: 12, color: T.color.textSub, fontFamily: T.font.sans }}>{j.userName}</span>
              <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.id}</span>
              <Pill>{total}개</Pill>
              {j.exit ? <BoolPill value={j.exit.finished} trueLabel="완료" falseLabel="미완료" /> : <span style={{ color: T.color.textMuted, fontSize: 12 }}>—</span>}
              <Pill color={T.color.accent} bg={T.color.accentLight}>{pass} / {total}</Pill>
              {j.exit ? <Pill color={T.color.accent} bg={T.color.accentLight}>{j.exit.method}</Pill> : <span style={{ color: T.color.textMuted, fontSize: 12 }}>—</span>}
            </div>
          );
        })}
      </TableContainer>
    </div>
  );
}
