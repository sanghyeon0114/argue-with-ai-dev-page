import React, { useEffect, useState } from 'react';
import { PageHeader, LoadingSpinner, T, AppPill } from './OverviewPage';
import {
  Session, BlockingDoc, AffirmationDoc, JustificationDoc, ExitData, ScreenUsage, KeyboardUsage,
  subscribeAllSessions, subscribeAllBlocking, subscribeAllAffirmation, subscribeAllJustification,
  fetchSessionScreens, fetchSessionKeyboard, fmtSec,
} from '../data/firestoreData';

// ── Shared primitives ─────────────────────────────────────────────────────────
function Pill({ children, color = T.color.textSub, bg = 'rgba(0,0,0,0.06)' }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 500, fontFamily: T.font.sans, color, background: bg, whiteSpace: 'nowrap' }}>{children}</span>;
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

// 클릭하면 펼쳐지는 행 (User 상세 페이지의 Blocking/Affirmation/Justification/Sessions 탭과 동일한 패턴)
function ExpandableRow({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${T.color.border}` }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', cursor: 'pointer', background: open ? T.color.accentLight : 'transparent', transition: 'background 0.15s', userSelect: 'none' }}>
        <div style={{ flex: 1, minWidth: 0 }}>{summary}</div>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: open ? T.color.accent : 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 16, flexShrink: 0, transition: 'background 0.15s' }}>
          <span style={{ color: open ? '#fff' : T.color.textSub, fontSize: 9, display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </div>
      {open && <div style={{ padding: '16px 20px 20px', background: '#FAFAF9', borderTop: `1px solid ${T.color.border}` }}>{children}</div>}
    </div>
  );
}

function DetailGrid({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}><div>{left}</div><div>{right}</div></div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.color.textMuted, fontFamily: T.font.sans, marginBottom: 10, marginTop: 4 }}>{children}</div>;
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '8px 0', borderBottom: `1px solid ${T.color.border}` }}>{children}</div>;
}

function MessageMeta({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: T.color.textMuted, marginBottom: 3, fontFamily: T.font.mono }}>{children}</div>;
}

function MessageText({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: T.color.text, lineHeight: 1.55, fontFamily: T.font.sans }}>{children}</div>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${T.color.border}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: T.color.textMuted, flexShrink: 0, fontFamily: T.font.sans }}>{label}</span>
      <span style={{ fontSize: 12, color: T.color.text, textAlign: 'right', fontFamily: T.font.sans }}>{children}</span>
    </div>
  );
}

function ExitDetail({ exit }: { exit: ExitData | null }) {
  return (
    <div>
      <SectionLabel>Exit</SectionLabel>
      {exit ? (
        <div style={{ background: '#F9F9F7', border: `1px solid ${T.color.border}`, borderRadius: T.radius.md, padding: '10px 14px' }}>
          <InfoRow label="finished"><Pill color={exit.finished ? T.color.success : T.color.warn} bg={exit.finished ? T.color.successLight : T.color.warnLight}>{String(exit.finished)}</Pill></InfoRow>
          <InfoRow label="method"><Pill color={T.color.accent} bg={T.color.accentLight}>{exit.method}</Pill></InfoRow>
          <InfoRow label="note">{exit.note || '—'}</InfoRow>
          <InfoRow label="at"><span style={{ fontFamily: T.font.mono, fontSize: 11 }}>{exit.at}</span></InfoRow>
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', border: `1px dashed ${T.color.border}`, borderRadius: T.radius.md, color: T.color.textMuted, fontSize: 12, fontFamily: T.font.sans }}>exit 데이터 없음</div>
      )}
    </div>
  );
}

// ── Total ─────────────────────────────────────────────────────────────────────
// Sessions/Blocking/Affirmation/Justification 4개 컬렉션을 하나의 타임라인으로 합쳐서 시간순으로 보여준다.
// 정렬 기준(atMs): session은 startEpoch, 나머지는 logStart()가 기록한 start.atMs.
type TotalEvent =
  | { kind: 'session'; atMs: number; data: Session & { userId: string; userName: string } }
  | { kind: 'blocking'; atMs: number; data: BlockingDoc & { userId: string; userName: string; updatedAt: string } }
  | { kind: 'affirmation'; atMs: number; data: AffirmationDoc & { userId: string; userName: string } }
  | { kind: 'justification'; atMs: number; data: JustificationDoc & { userId: string; userName: string } };

const KIND_META: Record<TotalEvent['kind'], { label: string; color: string; bg: string; icon: string }> = {
  session:       { label: 'Session',       color: '#0369A1',      bg: '#E0F2FE',           icon: '🕐' },
  blocking:      { label: 'Blocking',      color: T.color.danger, bg: T.color.dangerLight, icon: '🚫' },
  affirmation:   { label: 'Affirmation',   color: T.color.accent, bg: T.color.accentLight, icon: '💬' },
  justification: { label: 'Justification', color: T.color.success, bg: T.color.successLight, icon: '✅' },
};

export function TotalPage() {
  const [sessions, setSessions] = useState<(Session & { userId: string; userName: string })[]>([]);
  const [blocking, setBlocking] = useState<(BlockingDoc & { userId: string; userName: string; updatedAt: string })[]>([]);
  const [affirmation, setAffirmation] = useState<(AffirmationDoc & { userId: string; userName: string })[]>([]);
  const [justification, setJustification] = useState<(JustificationDoc & { userId: string; userName: string })[]>([]);
  const [ready, setReady] = useState({ sessions: false, blocking: false, affirmation: false, justification: false });

  useEffect(() => {
    const u1 = subscribeAllSessions(d => { setSessions(d); setReady(r => ({ ...r, sessions: true })); });
    const u2 = subscribeAllBlocking(d => { setBlocking(d); setReady(r => ({ ...r, blocking: true })); });
    const u3 = subscribeAllAffirmation(d => { setAffirmation(d); setReady(r => ({ ...r, affirmation: true })); });
    const u4 = subscribeAllJustification(d => { setJustification(d); setReady(r => ({ ...r, justification: true })); });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const loading = !ready.sessions || !ready.blocking || !ready.affirmation || !ready.justification;
  if (loading) return <LoadingSpinner />;

  const events: TotalEvent[] = [
    ...sessions.map(data => ({ kind: 'session' as const, atMs: data.startEpoch ?? 0, data })),
    ...blocking.map(data => ({ kind: 'blocking' as const, atMs: data.start?.atMs ?? 0, data })),
    ...affirmation.map(data => ({ kind: 'affirmation' as const, atMs: data.start?.atMs ?? 0, data })),
    ...justification.map(data => ({ kind: 'justification' as const, atMs: data.start?.atMs ?? 0, data })),
  ].sort((a, b) => b.atMs - a.atMs);

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Total" subtitle="Sessions · Blocking · Affirmation · Justification 통합 타임라인 (시간순)" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <Metric label="전체 이벤트" value={events.length.toLocaleString()} />
        <Metric label="Sessions" value={sessions.length} />
        <Metric label="Blocking" value={blocking.length} />
        <Metric label="Affirmation" value={affirmation.length} />
        <Metric label="Justification" value={justification.length} />
      </div>
      <TableContainer>
        {events.length === 0 && <EmptyState message="이벤트 없음" />}
        {events.map(ev => (
          <ExpandableRow key={`${ev.kind}-${ev.data.id}`} summary={<TotalEventSummary event={ev} />}>
            <TotalEventDetail event={ev} />
          </ExpandableRow>
        ))}
      </TableContainer>
    </div>
  );
}

function eventAtLabel(event: TotalEvent): string {
  if (event.kind === 'session') return event.data.startTime || '—';
  return event.data.start?.at || '—';
}

function TotalEventSummary({ event }: { event: TotalEvent }) {
  const meta = KIND_META[event.kind];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Pill color={meta.color} bg={meta.bg}>{meta.icon} {meta.label}</Pill>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.color.text, fontFamily: T.font.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{event.data.userName}</span>
      <Pill>{eventAtLabel(event)}</Pill>
      {event.kind === 'session' ? (
        <>
          <AppPill app={event.data.app} />
          <Pill color={T.color.accent} bg={T.color.accentLight}>{fmtSec(event.data.durationSec)}</Pill>
        </>
      ) : (
        <>
          <Pill>{event.data.messages.length}개 메시지</Pill>
          {event.data.exit ? (
            <Pill color={event.data.exit.finished ? T.color.success : T.color.warn} bg={event.data.exit.finished ? T.color.successLight : T.color.warnLight}>{event.data.exit.finished ? '완료' : '미완료'}</Pill>
          ) : (
            <Pill color={T.color.textMuted}>exit 없음</Pill>
          )}
        </>
      )}
    </div>
  );
}

function TotalEventDetail({ event }: { event: TotalEvent }) {
  if (event.kind === 'session') {
    return <SessionDetail session={event.data} />;
  }

  if (event.kind === 'blocking') {
    const d = event.data;
    return (
      <DetailGrid
        left={<div><SectionLabel>Messages</SectionLabel>{d.messages.map(m => (<MessageRow key={m.id}><MessageMeta>#{m.id} · {m.updatedAt}</MessageMeta><MessageText>{m.message}</MessageText></MessageRow>))}</div>}
        right={<ExitDetail exit={d.exit} />}
      />
    );
  }

  if (event.kind === 'affirmation') {
    const d = event.data;
    return (
      <DetailGrid
        left={<div><SectionLabel>Messages</SectionLabel>{d.messages.map(m => (<MessageRow key={m.id}><MessageMeta>{m.question}</MessageMeta><MessageText>{m.answer || <span style={{ color: T.color.textMuted, fontStyle: 'italic' }}>답변 없음</span>}</MessageText></MessageRow>))}</div>}
        right={<ExitDetail exit={d.exit} />}
      />
    );
  }

  const d = event.data;
  return (
    <DetailGrid
      left={<div><SectionLabel>Messages</SectionLabel>{d.messages.map(m => (
        <MessageRow key={m.id}>
          <MessageMeta>Q{m.order} · idx:{m.questionIdx} · {m.updatedAt}</MessageMeta>
          <MessageText>{m.answer || <span style={{ color: T.color.textMuted, fontStyle: 'italic' }}>답변 없음</span>}</MessageText>
          {m.score !== undefined && <div style={{ marginTop: 5 }}><Pill color={m.score ? T.color.success : T.color.danger} bg={m.score ? T.color.successLight : T.color.dangerLight}>{m.score ? '✓ true' : '✗ false'}</Pill></div>}
        </MessageRow>
      ))}</div>}
      right={<ExitDetail exit={d.exit} />}
    />
  );
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export function SessionsPage() {
  const [sessions, setSessions] = useState<(Session & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAllSessions(d => { setSessions(d); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return <LoadingSpinner />;

  const total = sessions.length;
  const avgSec = total > 0 ? Math.round(sessions.reduce((s, r) => s + r.durationSec, 0) / total) : 0;
  const appCounts: Record<string, number> = {};
  sessions.forEach(s => { appCounts[s.app] = (appCounts[s.app] || 0) + 1; });
  const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Sessions" subtitle="sessions 컬렉션 전체 데이터 · 세션을 클릭하면 screens/keyboard 상세가 펼쳐집니다" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <Metric label="총 세션" value={total.toLocaleString()} />
        <Metric label="평균 사용시간" value={fmtSec(avgSec)} />
        <Metric label="총 사용자" value={new Set(sessions.map(s => s.userId)).size} />
        <Metric label="최다 앱" value={<AppPill app={topApp} />} />
      </div>
      <TableContainer>
        {sessions.length === 0 && <EmptyState message="세션 없음" />}
        {sessions.map(s => (
          <ExpandableRow key={s.id} summary={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.color.text, fontFamily: T.font.sans, marginRight: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{s.userName}</span>
              <AppPill app={s.app} />
              <Pill>{s.day}</Pill>
              <Pill>시작 {s.startTime}</Pill>
              <Pill>종료 {s.endTime || '—'}</Pill>
              <Pill color={T.color.accent} bg={T.color.accentLight}>{fmtSec(s.durationSec)}</Pill>
            </div>
          }>
            <SessionDetail session={s} />
          </ExpandableRow>
        ))}
      </TableContainer>
    </div>
  );
}

// 클릭해서 펼쳤을 때만 screens/keyboard 하위 컬렉션을 불러온다 (지연 로딩).
// 두 목록 모두 fetchSessionScreens/fetchSessionKeyboard에서 startEpoch 오름차순(시간순)으로 정렬해서 내려온다.
function SessionDetail({ session }: { session: Session & { userId: string; userName: string } }) {
  const [screens, setScreens] = useState<ScreenUsage[] | null>(null);
  const [keyboard, setKeyboard] = useState<KeyboardUsage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setScreens(null);
    setKeyboard(null);
    fetchSessionScreens(session.userId, session.sourceCollection, session.id).then(d => { if (!cancelled) setScreens(d); });
    fetchSessionKeyboard(session.userId, session.sourceCollection, session.id).then(d => { if (!cancelled) setKeyboard(d); });
    return () => { cancelled = true; };
  }, [session.userId, session.sourceCollection, session.id]);

  return (
    <DetailGrid
      left={
        <div>
          <SectionLabel>Screens {screens ? `(${screens.length})` : ''}</SectionLabel>
          {screens === null ? (
            <div style={{ fontSize: 12, color: T.color.textMuted, padding: '8px 0', fontFamily: T.font.sans }}>불러오는 중...</div>
          ) : screens.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', border: `1px dashed ${T.color.border}`, borderRadius: T.radius.md, color: T.color.textMuted, fontSize: 12, fontFamily: T.font.sans }}>screens 데이터 없음</div>
          ) : (
            screens.map(sc => (
              <MessageRow key={sc.id}>
                <MessageMeta>{sc.startTime} → {sc.endTime || '—'}</MessageMeta>
                <MessageText>{sc.screen || <span style={{ color: T.color.textMuted, fontStyle: 'italic' }}>알 수 없음</span>} <span style={{ color: T.color.textMuted, fontSize: 11 }}>· {fmtSec(Math.round(sc.durationMs / 1000))}</span></MessageText>
              </MessageRow>
            ))
          )}
        </div>
      }
      right={
        <div>
          <SectionLabel>Keyboard {keyboard ? `(${keyboard.length})` : ''}</SectionLabel>
          {keyboard === null ? (
            <div style={{ fontSize: 12, color: T.color.textMuted, padding: '8px 0', fontFamily: T.font.sans }}>불러오는 중...</div>
          ) : keyboard.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', border: `1px dashed ${T.color.border}`, borderRadius: T.radius.md, color: T.color.textMuted, fontSize: 12, fontFamily: T.font.sans }}>keyboard 데이터 없음</div>
          ) : (
            keyboard.map(k => (
              <MessageRow key={k.id}>
                <MessageMeta>{k.startTime} → {k.endTime || '—'}</MessageMeta>
                <MessageText>{fmtSec(Math.round(k.durationMs / 1000))}</MessageText>
              </MessageRow>
            ))
          )}
        </div>
      }
    />
  );
}

// ── Blocking ──────────────────────────────────────────────────────────────────
export function BlockingPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAllBlocking(d => { setDocs(d); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return <LoadingSpinner />;

  const COLS = '1.2fr 1.8fr 80px 100px 1fr';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Blocking" subtitle="blocking 컬렉션 전체 데이터" />
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

  useEffect(() => {
    const unsub = subscribeAllAffirmation(d => { setDocs(d); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return <LoadingSpinner />;

  const finished = docs.filter(a => a.exit?.finished).length;
  const methods: Record<string, number> = {};
  docs.forEach(a => { if (a.exit?.method) methods[a.exit.method] = (methods[a.exit.method] || 0) + 1; });
  const COLS = '1.2fr 1.8fr 80px 100px 120px 1fr';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Affirmation" subtitle="affirmation 컬렉션 전체 데이터" />
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

  useEffect(() => {
    const unsub = subscribeAllJustification(d => { setDocs(d); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return <LoadingSpinner />;

  const finished = docs.filter(j => j.exit?.finished).length;
  const allMessages = docs.flatMap(j => j.messages);
  const passCount = allMessages.filter(m => m.score === true).length;
  const methods: Record<string, number> = {};
  docs.forEach(j => { if (j.exit?.method) methods[j.exit.method] = (methods[j.exit.method] || 0) + 1; });
  const COLS = '1.2fr 1.8fr 80px 100px 110px 120px';

  return (
    <div style={{ fontFamily: T.font.sans }}>
      <PageHeader title="Justification" subtitle="justification 컬렉션 전체 데이터" />
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
          const pass = j.messages.filter((m: any) => m.score === true).length;
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
