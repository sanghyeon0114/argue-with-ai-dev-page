import React, { useState, useEffect } from 'react';
import { Card, Badge, BoolBadge, DataTable, FieldRow } from '../components/ui';
import { PageHeader, LoadingSpinner } from './OverviewPage';
import {
  User, BlockingDoc, BlockingMessage, AffirmationDoc, JustificationDoc, Session,
  fetchUsers, fetchBlockingDocs, fetchAffirmationDocs, fetchJustificationDocs, fetchUserSessions, fmtSec,
} from '../data/firestoreData';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  radius: { sm: 6, md: 10, lg: 16 },
  font: {
    mono: "'IBM Plex Mono', 'Fira Code', monospace",
    sans: "'DM Sans', 'Pretendard', system-ui, sans-serif",
  },
  color: {
    bg: '#F7F6F3',
    surface: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.14)',
    text: '#18181B',
    textSub: '#71717A',
    textMuted: '#A1A1AA',
    accent: '#6152E8',
    accentLight: '#EEF0FF',
    success: '#16A34A',
    successLight: '#DCFCE7',
    warn: '#D97706',
    warnLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
  },
};

// ── Shared micro-components ───────────────────────────────────────────────────
function Pill({
  children,
  color = T.color.textSub,
  bg = 'rgba(0,0,0,0.05)',
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.01em',
      color, background: bg, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: ok ? T.color.success : T.color.textMuted,
      boxShadow: ok ? `0 0 0 2px ${T.color.successLight}` : 'none',
      flexShrink: 0,
    }} />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: T.color.textMuted,
      marginBottom: 10, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.color.border, margin: '10px 0' }} />;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0', borderBottom: `1px solid ${T.color.border}`,
      gap: 12,
    }}>
      <span style={{ fontSize: 12, color: T.color.textSub, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: T.color.text, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

// ── ExpandableRow ─────────────────────────────────────────────────────────────
function ExpandableRow({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: `1px solid ${T.color.border}`,
      transition: 'background 0.15s',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 20px', cursor: 'pointer',
          background: open ? T.color.accentLight : 'transparent',
          transition: 'background 0.15s',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>{summary}</div>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: open ? T.color.accent : T.color.border,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: 16, flexShrink: 0, transition: 'background 0.15s',
        }}>
          <span style={{
            color: open ? '#fff' : T.color.textSub,
            fontSize: 10, lineHeight: 1,
            transform: open ? 'rotate(180deg)' : 'none',
            display: 'inline-block', transition: 'transform 0.2s',
          }}>▼</span>
        </div>
      </div>
      {open && (
        <div style={{
          padding: '16px 20px 20px',
          background: '#FAFAF9',
          borderTop: `1px solid ${T.color.border}`,
          animation: 'fadeIn 0.15s ease',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Users List ────────────────────────────────────────────────────────────────
interface UsersPageProps {
  onSelectUser: (user: User) => void;
}

export function UsersPage({ onSelectUser }: UsersPageProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then(data => { setUsers(data); setLoading(false); });
  }, []);

  const filtered = users.filter(u => u.name.includes(query) || u.id.includes(query));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Users" subtitle={`전체 ${users.length}명`} />

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: T.color.textMuted, fontSize: 14, pointerEvents: 'none',
        }}>⌕</span>
        <input
          type="text"
          placeholder="사용자 ID 또는 이름 검색"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 14px 9px 34px',
            fontSize: 13, fontFamily: T.font.sans,
            border: `1px solid ${T.color.borderStrong}`,
            borderRadius: T.radius.md,
            outline: 'none', color: T.color.text,
            background: T.color.surface,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: T.color.surface,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1.8fr 120px 80px 1.4fr 28px',
          padding: '9px 20px',
          background: '#F4F4F2',
          borderBottom: `1px solid ${T.color.border}`,
          gap: 8,
        }}>
          {['User ID', '이름', '기기', 'Intervention', '접근성', '업데이트', ''].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: T.color.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: T.color.textMuted, fontSize: 13 }}>
            검색 결과 없음
          </div>
        )}
        {filtered.map((u, i) => (
          <div
            key={u.id}
            onClick={() => onSelectUser(u)}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1.8fr 120px 80px 1.4fr 28px',
              padding: '12px 20px',
              borderBottom: i < filtered.length - 1 ? `1px solid ${T.color.border}` : 'none',
              cursor: 'pointer', alignItems: 'center', gap: 8,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = T.color.accentLight)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.id}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.color.text }}>{u.name}</span>
            <span style={{ fontSize: 12, color: T.color.textSub }}>{u.device.manufacturer} {u.device.model}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot ok={u.interventionEnabled} />
              <span style={{ fontSize: 12, color: u.interventionEnabled ? T.color.success : T.color.textMuted }}>
                {u.interventionEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot ok={u.accessibilityEnabled} />
              <span style={{ fontSize: 12, color: u.accessibilityEnabled ? T.color.success : T.color.textMuted }}>
                {u.accessibilityEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <span style={{ fontSize: 11, color: T.color.textMuted }}>{u.updatedAt}</span>
            <span style={{ color: T.color.textMuted, fontSize: 16 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── User Detail ───────────────────────────────────────────────────────────────
type DetailTab = 'profile' | 'blocking' | 'affirmation' | 'justification' | 'sessions';

interface UserDetailPageProps {
  user: User;
  onBack: () => void;
}

export function UserDetailPage({ user, onBack }: UserDetailPageProps) {
  const [tab, setTab] = useState<DetailTab>('profile');

  return (
    <div>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: T.color.textSub, cursor: 'pointer',
          padding: '6px 12px', border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.sm, marginBottom: '1.25rem',
          background: T.color.surface, fontFamily: T.font.sans,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = T.color.accent)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = T.color.border)}
      >
        ← Users
      </button>

      {/* User header card */}
      <div style={{
        background: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg,
        padding: '18px 24px',
        marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: T.color.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          👤
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.color.text }}>{user.name}</div>
          <div style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.id}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill color={user.interventionEnabled ? T.color.success : T.color.textMuted} bg={user.interventionEnabled ? T.color.successLight : 'rgba(0,0,0,0.05)'}>
            Intervention {user.interventionEnabled ? 'ON' : 'OFF'}
          </Pill>
          <Pill color={user.accessibilityEnabled ? T.color.success : T.color.textMuted} bg={user.accessibilityEnabled ? T.color.successLight : 'rgba(0,0,0,0.05)'}>
            접근성 {user.accessibilityEnabled ? 'ON' : 'OFF'}
          </Pill>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.md,
        padding: 4, marginBottom: '1.25rem',
        width: 'fit-content',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {(['profile', 'blocking', 'affirmation', 'justification', 'sessions'] as DetailTab[]).map(t => (
          <TabButton key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {tab === 'profile' && <ProfileTab user={user} />}
      {tab === 'blocking' && <BlockingTab userId={user.id} />}
      {tab === 'affirmation' && <AffirmationTab userId={user.id} />}
      {tab === 'justification' && <JustificationTab userId={user.id} />}
      {tab === 'sessions' && <SessionsTab userId={user.id} />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const labels: Record<string, string> = {
    profile: 'Profile', blocking: 'Blocking',
    affirmation: 'Affirmation', justification: 'Justification', sessions: 'Sessions',
  };
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 14px', fontSize: 12, fontWeight: 500,
        cursor: 'pointer', borderRadius: T.radius.sm - 2,
        background: active ? T.color.accent : 'transparent',
        color: active ? '#fff' : T.color.textSub,
        transition: 'all 0.15s', userSelect: 'none',
        fontFamily: T.font.sans,
      }}
    >
      {labels[label]}
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ user }: { user: User }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {/* userInfo */}
      <ProfileCard title="userInfo" icon="👤">
        <InfoRow label="name">{user.name}</InfoRow>
        <InfoRow label="updatedAt"><span style={{ fontFamily: T.font.mono, fontSize: 11 }}>{user.updatedAt}</span></InfoRow>
      </ProfileCard>

      {/* accessibility */}
      <ProfileCard title="accessibility" icon="♿">
        <InfoRow label="enabled">
          <Pill color={user.accessibilityEnabled ? T.color.success : T.color.textMuted} bg={user.accessibilityEnabled ? T.color.successLight : 'rgba(0,0,0,0.05)'}>
            {user.accessibilityEnabled ? 'true' : 'false'}
          </Pill>
        </InfoRow>
        <InfoRow label="manufacturer">{user.device.manufacturer}</InfoRow>
        <InfoRow label="model">{user.device.model}</InfoRow>
        <InfoRow label="sdkInt"><span style={{ fontFamily: T.font.mono, fontSize: 12 }}>{user.device.sdkInt}</span></InfoRow>
      </ProfileCard>

      {/* intervention */}
      <ProfileCard title="intervention" icon="🛡">
        <InfoRow label="enabled">
          <Pill color={user.interventionEnabled ? T.color.success : T.color.textMuted} bg={user.interventionEnabled ? T.color.successLight : 'rgba(0,0,0,0.05)'}>
            {user.interventionEnabled ? 'true' : 'false'}
          </Pill>
        </InfoRow>
      </ProfileCard>
    </div>
  );
}

function ProfileCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: T.color.surface,
      border: `1px solid ${T.color.border}`,
      borderRadius: T.radius.lg,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        padding: '11px 16px',
        borderBottom: `1px solid ${T.color.border}`,
        background: '#F9F9F7',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.color.text, fontFamily: T.font.mono }}>{title}</span>
      </div>
      <div style={{ padding: '4px 16px 8px' }}>{children}</div>
    </div>
  );
}

// ── Blocking Tab ──────────────────────────────────────────────────────────────
function BlockingTab({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<BlockingDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockingDocs(userId).then(d => { setDocs(d); setLoading(false); });
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (docs.length === 0) return <EmptyState message="Blocking 데이터 없음" />;

  return (
    <CollectionContainer>
      {docs.map(d => (
        <ExpandableRow
          key={d.id}
          summary={
            <RowSummary
              id={d.id}
              badges={[
                <Pill key="msg">{d.messages.length}개 메시지</Pill>,
                d.exit
                  ? <Pill key="fin" color={d.exit.finished ? T.color.success : T.color.warn} bg={d.exit.finished ? T.color.successLight : T.color.warnLight}>
                    {d.exit.finished ? '완료' : '미완료'}
                  </Pill>
                  : <Pill key="no-exit" color={T.color.textMuted}>exit 없음</Pill>,
                d.exit && <Pill key="method" color={T.color.accent} bg={T.color.accentLight}>{d.exit.method}</Pill>,
              ]}
            />
          }
        >
          <DetailGrid
            left={
              <div>
                <SectionLabel>Messages</SectionLabel>
                {d.messages.map(m => (
                  <MessageRow key={m.id}>
                    <MessageMeta>#{m.id} · {m.updatedAt}</MessageMeta>
                    <MessageText>{m.message}</MessageText>
                  </MessageRow>
                ))}
              </div>
            }
            right={<ExitDetail exit={d.exit} />}
          />
        </ExpandableRow>
      ))}
    </CollectionContainer>
  );
}

// ── Affirmation Tab ───────────────────────────────────────────────────────────
function AffirmationTab({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<AffirmationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffirmationDocs(userId).then(d => { setDocs(d); setLoading(false); });
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (docs.length === 0) return <EmptyState message="Affirmation 데이터 없음" />;

  return (
    <CollectionContainer>
      {docs.map(d => (
        <ExpandableRow
          key={d.id}
          summary={
            <RowSummary
              id={d.id}
              badges={[
                <Pill key="msg">{d.messages.length}개 메시지</Pill>,
                d.exit
                  ? <Pill key="fin" color={d.exit.finished ? T.color.success : T.color.warn} bg={d.exit.finished ? T.color.successLight : T.color.warnLight}>
                    {d.exit.finished ? '완료' : '미완료'}
                  </Pill>
                  : <Pill key="no-exit" color={T.color.textMuted}>exit 없음</Pill>,
                d.exit && <Pill key="method" color={T.color.accent} bg={T.color.accentLight}>{d.exit.method}</Pill>,
              ]}
            />
          }
        >
          <DetailGrid
            left={
              <div>
                <SectionLabel>Messages</SectionLabel>
                {d.messages.map(m => (
                  <MessageRow key={m.id}>
                    <MessageMeta>{m.question}</MessageMeta>
                    <MessageText>{m.answer || <span style={{ color: T.color.textMuted, fontStyle: 'italic' }}>답변 없음</span>}</MessageText>
                  </MessageRow>
                ))}
              </div>
            }
            right={<ExitDetail exit={d.exit} />}
          />
        </ExpandableRow>
      ))}
    </CollectionContainer>
  );
}

// ── Justification Tab ─────────────────────────────────────────────────────────
function JustificationTab({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<JustificationDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJustificationDocs(userId).then(d => { setDocs(d); setLoading(false); });
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (docs.length === 0) return <EmptyState message="Justification 데이터 없음" />;

  return (
    <CollectionContainer>
      {docs.map(d => {
        const passCount = d.messages.filter(m => m.score === true).length;
        const total = d.messages.length;
        return (
          <ExpandableRow
            key={d.id}
            summary={
              <RowSummary
                id={d.id}
                badges={[
                  <Pill key="msg">{total}개 메시지</Pill>,
                  <Pill key="score" color={T.color.accent} bg={T.color.accentLight}>
                    ✓ {passCount}/{total}
                  </Pill>,
                  d.exit
                    ? <Pill key="fin" color={d.exit.finished ? T.color.success : T.color.warn} bg={d.exit.finished ? T.color.successLight : T.color.warnLight}>
                      {d.exit.finished ? '완료' : '미완료'}
                    </Pill>
                    : <Pill key="no-exit" color={T.color.textMuted}>exit 없음</Pill>,
                  d.exit && <Pill key="method" color={T.color.accent} bg={T.color.accentLight}>{d.exit.method}</Pill>,
                ]}
              />
            }
          >
            <DetailGrid
              left={
                <div>
                  <SectionLabel>Messages</SectionLabel>
                  {d.messages.map(m => (
                    <MessageRow key={m.id}>
                      <MessageMeta>Q{m.order} · idx:{m.questionIdx} · {m.updatedAt}</MessageMeta>
                      <MessageText>{m.answer || <span style={{ color: T.color.textMuted, fontStyle: 'italic' }}>답변 없음</span>}</MessageText>
                      {m.score !== undefined && (
                        <div style={{ marginTop: 5 }}>
                          <Pill
                            color={m.score ? T.color.success : T.color.danger}
                            bg={m.score ? T.color.successLight : T.color.dangerLight}
                          >
                            {m.score ? '✓ true' : '✗ false'}
                          </Pill>
                        </div>
                      )}
                    </MessageRow>
                  ))}
                </div>
              }
              right={<ExitDetail exit={d.exit} />}
            />
          </ExpandableRow>
        );
      })}
    </CollectionContainer>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function SessionsTab({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserSessions(userId).then(s => { setSessions(s); setLoading(false); });
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (sessions.length === 0) return <EmptyState message="세션 없음" />;

  return (
    <div style={{
      background: T.color.surface,
      border: `1px solid ${T.color.border}`,
      borderRadius: T.radius.lg,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
        padding: '9px 20px', background: '#F4F4F2',
        borderBottom: `1px solid ${T.color.border}`,
      }}>
        {['앱', '날짜', '시작', '종료', '사용시간'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: T.color.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
        ))}
      </div>
      {sessions.map((s, i) => (
        <div key={s.id} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
          padding: '11px 20px', alignItems: 'center',
          borderBottom: i < sessions.length - 1 ? `1px solid ${T.color.border}` : 'none',
        }}>
          <Pill color={T.color.accent} bg={T.color.accentLight}>{s.app}</Pill>
          <span style={{ fontSize: 12, color: T.color.text }}>{s.day}</span>
          <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub }}>{s.startTime}</span>
          <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub }}>{s.endTime || '—'}</span>
          <span style={{ fontSize: 12, color: T.color.text, fontWeight: 500 }}>{fmtSec(s.durationSec)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Shared layout helpers ─────────────────────────────────────────────────────
function CollectionContainer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: T.color.surface,
      border: `1px solid ${T.color.border}`,
      borderRadius: T.radius.lg,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {children}
    </div>
  );
}

function RowSummary({ id, badges }: { id: string; badges: React.ReactNode[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.textSub, marginRight: 4 }}>{id}</span>
      {badges.filter(Boolean)}
    </div>
  );
}

function DetailGrid({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '8px 0',
      borderBottom: `1px solid ${T.color.border}`,
    }}>
      {children}
    </div>
  );
}

function MessageMeta({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: T.color.textMuted, marginBottom: 4, fontFamily: T.font.mono }}>{children}</div>;
}

function MessageText({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: T.color.text, lineHeight: 1.5 }}>{children}</div>;
}

function ExitDetail({ exit }: { exit: any }) {
  return (
    <div>
      <SectionLabel>Exit</SectionLabel>
      {exit ? (
        <div style={{
          background: '#F9F9F7',
          border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.md,
          padding: '10px 14px',
        }}>
          <InfoRow label="finished">
            <Pill color={exit.finished ? T.color.success : T.color.warn} bg={exit.finished ? T.color.successLight : T.color.warnLight}>
              {String(exit.finished)}
            </Pill>
          </InfoRow>
          <InfoRow label="method">
            <Pill color={T.color.accent} bg={T.color.accentLight}>{exit.method}</Pill>
          </InfoRow>
          <InfoRow label="note">{exit.note || '—'}</InfoRow>
          <InfoRow label="at"><span style={{ fontFamily: T.font.mono, fontSize: 11 }}>{exit.at}</span></InfoRow>
          <InfoRow label="atMs"><span style={{ fontFamily: T.font.mono, fontSize: 11 }}>{exit.atMs}</span></InfoRow>
        </div>
      ) : (
        <div style={{
          padding: '20px', textAlign: 'center',
          border: `1px dashed ${T.color.border}`,
          borderRadius: T.radius.md,
          color: T.color.textMuted, fontSize: 12,
        }}>
          exit 데이터 없음
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: '48px', textAlign: 'center',
      background: T.color.surface,
      border: `1px dashed ${T.color.border}`,
      borderRadius: T.radius.lg,
      color: T.color.textMuted, fontSize: 13,
    }}>
      {message}
    </div>
  );
}
