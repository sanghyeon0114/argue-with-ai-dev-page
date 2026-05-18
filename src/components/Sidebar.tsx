import React from 'react';

export type PageName =
  | 'overview'
  | 'users'
  | 'user-detail'
  | 'sessions'
  | 'blocking'
  | 'affirmation'
  | 'justification';

interface NavItem {
  page: PageName;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'overview',      label: 'Dashboard',    icon: '⊞' },
  { page: 'users',         label: 'Users',         icon: '👤' },
  { page: 'sessions',      label: 'Sessions',      icon: '🕐' },
  { page: 'blocking',      label: 'Blocking',      icon: '🚫' },
  { page: 'affirmation',   label: 'Affirmation',   icon: '💬' },
  { page: 'justification', label: 'Justification', icon: '✅' },
];

interface SidebarProps {
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const activeBase = currentPage === 'user-detail' ? 'users' : currentPage;

  return (
    <nav style={{
      width: 220,
      background: '#fff',
      borderRight: '0.5px solid rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.25rem 1rem',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        marginBottom: '0.5rem',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, color: '#7F77DD' }}>🛡</span>
          Admin Console
        </div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Firestore Manager</div>
      </div>

      {/* Overview section */}
      <div style={{ padding: '0 0 0.25rem' }}>
        <SectionLabel>Overview</SectionLabel>
        {NAV_ITEMS.slice(0, 2).map(item => (
          <NavItemRow
            key={item.page}
            item={item}
            active={activeBase === item.page}
            onClick={() => onNavigate(item.page)}
          />
        ))}
      </div>

      {/* Collections section */}
      <div style={{ padding: '0.25rem 0 0' }}>
        <SectionLabel>Collections</SectionLabel>
        {NAV_ITEMS.slice(2).map(item => (
          <NavItemRow
            key={item.page}
            item={item}
            active={activeBase === item.page}
            onClick={() => onNavigate(item.page)}
          />
        ))}
      </div>
    </nav>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 500,
      color: '#bbb',
      padding: '0.75rem 1rem 0.25rem',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {children}
    </div>
  );
}

function NavItemRow({ item, active, onClick }: {
  item: NavItem; active: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 1rem',
        fontSize: 14,
        color: active ? '#1a1a18' : '#888',
        fontWeight: active ? 500 : 400,
        cursor: 'pointer',
        borderLeft: active ? '2px solid #7F77DD' : '2px solid transparent',
        background: active || hovered ? '#f5f5f3' : 'transparent',
        transition: 'all 0.12s',
      }}
    >
      <span style={{ fontSize: 15 }}>{item.icon}</span>
      {item.label}
    </div>
  );
}
