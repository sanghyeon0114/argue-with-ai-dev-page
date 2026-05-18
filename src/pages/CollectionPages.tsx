import React, { useEffect, useState } from 'react';
import { Card, MetricCard, Badge, BoolBadge, DataTable } from '../components/ui';
import { PageHeader, LoadingSpinner } from './OverviewPage';
import {
  Session, AffirmationDoc, JustificationDoc,
  fetchAllSessions, fetchAllBlocking, fetchAllAffirmation, fetchAllJustification, fmtSec,
} from '../data/firestoreData';

// ── Sessions ──────────────────────────────────────────────────────────────────
export function SessionsPage() {
  const [sessions, setSessions] = useState<(Session & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllSessions().then(s => { setSessions(s); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;

  const total = sessions.length;
  const avgSec = total > 0 ? Math.round(sessions.reduce((s, r) => s + r.durationSec, 0) / total) : 0;
  const appCounts: Record<string, number> = {};
  sessions.forEach(s => { appCounts[s.app] = (appCounts[s.app] || 0) + 1; });
  const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <div>
      <PageHeader title="Sessions" subtitle="sessions 컬렉션 전체 데이터" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <MetricCard label="총 세션" value={total.toLocaleString()} />
        <MetricCard label="평균 사용시간" value={fmtSec(avgSec)} />
        <MetricCard label="총 사용자" value={new Set(sessions.map(s => s.userId)).size} />
        <MetricCard label="최다 앱" value={topApp} />
      </div>
      <Card noPadding>
        <DataTable
          data={sessions}
          columns={[
            { key: 'user', header: 'User', render: s => <span style={{ fontSize: 12, color: '#888' }}>{s.userName}</span> },
            { key: 'app', header: '앱', render: s => <Badge variant="gray">{s.app}</Badge> },
            { key: 'day', header: '날짜', render: s => <span style={{ fontSize: 12 }}>{s.day}</span> },
            { key: 'startTime', header: '시작시간', render: s => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.startTime}</span> },
            { key: 'endTime', header: '종료시간', render: s => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.endTime || '—'}</span> },
            { key: 'duration', header: '사용시간', render: s => fmtSec(s.durationSec) },
          ]}
        />
      </Card>
    </div>
  );
}

// ── Blocking ──────────────────────────────────────────────────────────────────
export function BlockingPage() {
  const [docs, setDocs] = useState<{ id: string; userId: string; userName: string; updatedAt: string; messages: any[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllBlocking().then(d => { setDocs(d); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Blocking" subtitle="blocking 컬렉션 전체 데이터" />
      <Card noPadding>
        <DataTable
          data={docs}
          columns={[
            { key: 'user', header: 'User', render: b => <span style={{ fontSize: 12, color: '#888' }}>{b.userName}</span> },
            { key: 'docId', header: 'Document ID', render: b => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{b.id}</span> },
            { key: 'msgCount', header: '메시지 수', render: b => b.messages.length },
            { key: 'updatedAt', header: '마지막 업데이트', render: b => <span style={{ fontSize: 12 }}>{b.updatedAt}</span> },
          ]}
        />
      </Card>
    </div>
  );
}

// ── Affirmation ───────────────────────────────────────────────────────────────
export function AffirmationPage() {
  const [docs, setDocs] = useState<(AffirmationDoc & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllAffirmation().then(d => { setDocs(d); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;

  const finished = docs.filter(a => a.exit?.finished).length;
  const methods: Record<string, number> = {};
  docs.forEach(a => { if (a.exit?.method) methods[a.exit.method] = (methods[a.exit.method] || 0) + 1; });

  return (
    <div>
      <PageHeader title="Affirmation" subtitle="affirmation 컬렉션 전체 데이터" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <MetricCard label="총 세션" value={docs.length} />
        <MetricCard label="완료(finished)" value={finished} />
        <MetricCard label="Exit: back" value={methods['back'] ?? 0} />
        <MetricCard label="Exit: timeout" value={methods['timeout'] ?? 0} />
      </div>
      <Card noPadding>
        <DataTable
          data={docs}
          columns={[
            { key: 'user', header: 'User', render: a => <span style={{ fontSize: 12, color: '#888' }}>{a.userName}</span> },
            { key: 'docId', header: 'Document ID', render: a => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{a.id}</span> },
            { key: 'msgCount', header: '메시지 수', render: a => a.messages.length },
            { key: 'finished', header: '완료 여부', render: a => a.exit ? <BoolBadge value={a.exit.finished} trueLabel="완료" falseLabel="미완료" /> : <span style={{ color: '#aaa' }}>—</span> },
            { key: 'method', header: 'Exit method', render: a => a.exit ? <Badge variant="info">{a.exit.method}</Badge> : <span style={{ color: '#aaa' }}>—</span> },
            { key: 'at', header: '시각', render: a => <span style={{ fontSize: 12 }}>{a.exit?.at ?? '—'}</span> },
          ]}
        />
      </Card>
    </div>
  );
}

// ── Justification ─────────────────────────────────────────────────────────────
export function JustificationPage() {
  const [docs, setDocs] = useState<(JustificationDoc & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllJustification().then(d => { setDocs(d); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;

  const finished = docs.filter(j => j.exit?.finished).length;
  const allMessages = docs.flatMap(j => j.messages);
  const passCount = allMessages.filter(m => m.score === true).length;
  const methods: Record<string, number> = {};
  docs.forEach(j => { if (j.exit?.method) methods[j.exit.method] = (methods[j.exit.method] || 0) + 1; });

  return (
    <div>
      <PageHeader title="Justification" subtitle="justification 컬렉션 전체 데이터" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <MetricCard label="총 세션" value={docs.length} />
        <MetricCard label="완료(finished)" value={finished} />
        <MetricCard label="score: true" value={passCount} />
        <MetricCard label="Exit: back" value={methods['back'] ?? 0} />
      </div>
      <Card noPadding>
        <DataTable
          data={docs}
          columns={[
            { key: 'user', header: 'User', render: j => <span style={{ fontSize: 12, color: '#888' }}>{j.userName}</span> },
            { key: 'docId', header: 'Document ID', render: j => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{j.id}</span> },
            { key: 'msgCount', header: '메시지 수', render: j => j.messages.length },
            { key: 'finished', header: '완료 여부', render: j => j.exit ? <BoolBadge value={j.exit.finished} trueLabel="완료" falseLabel="미완료" /> : <span style={{ color: '#aaa' }}>—</span> },
            {
              key: 'scorePass', header: 'score true',
              render: j => {
                const pass = j.messages.filter(m => m.score === true).length;
                const total = j.messages.length;
                return <Badge variant="warn">{pass} / {total}</Badge>;
              },
            },
            { key: 'method', header: 'Exit method', render: j => j.exit ? <Badge variant="info">{j.exit.method}</Badge> : <span style={{ color: '#aaa' }}>—</span> },
          ]}
        />
      </Card>
    </div>
  );
}