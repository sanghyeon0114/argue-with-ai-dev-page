import React, { useEffect, useState } from 'react';
import { MetricCard, Card, FieldRow, UsageBar } from '../components/ui';
import {
  User, Session, AffirmationDoc, JustificationDoc,
  fetchUsers, fetchAllSessions, fetchAllAffirmation, fetchAllJustification,
} from '../data/firestoreData';

export function OverviewPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<(Session & { userId: string; userName: string })[]>([]);
  const [affirmations, setAffirmations] = useState<(AffirmationDoc & { userId: string; userName: string })[]>([]);
  const [justifications, setJustifications] = useState<(JustificationDoc & { userId: string; userName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchAllSessions(),
      fetchAllAffirmation(),
      fetchAllJustification(),
    ]).then(([u, s, a, j]) => {
      setUsers(u);
      setSessions(s);
      setAffirmations(a);
      setJustifications(j);
      setLoading(false);
    });
  }, []);

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
    <div>
      <PageHeader title="Dashboard" subtitle="전체 사용자 및 데이터 현황" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <MetricCard label="전체 사용자" value={users.length} sub="활성 계정" />
        <MetricCard label="총 세션" value={sessions.length.toLocaleString()} sub="누적 기록" />
        <MetricCard label="Affirmation 완료" value={affFinished} sub="finished: true" />
        <MetricCard label="Justification 완료" value={justFinished} sub="finished: true" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card title="앱 사용 현황">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topApps.length === 0
              ? <span style={{ fontSize: 13, color: '#aaa' }}>데이터 없음</span>
              : topApps.map(([app, count]) => <UsageBar key={app} label={app} value={count} max={maxCount} />)
            }
          </div>
        </Card>
        <Card title="Intervention 현황">
          <FieldRow label="Intervention 활성 사용자" value={`${interventionActive}명`} />
          <FieldRow label="비활성 사용자" value={`${users.length - interventionActive}명`} />
          <FieldRow label="접근성 활성 사용자" value={`${accessibilityActive}명`} />
          <FieldRow label="총 Affirmation 세션" value={affirmations.length} />
          <FieldRow label="총 Justification 세션" value={justifications.length} />
        </Card>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a18', margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#aaa', fontSize: 14 }}>
      불러오는 중...
    </div>
  );
}