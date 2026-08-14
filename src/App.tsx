import React, { useState } from 'react';
import { Sidebar, PageName } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage, UserDetailPage } from './pages/UsersPage';
import { TotalPage, SessionsPage, BlockingPage, AffirmationPage, JustificationPage } from './pages/CollectionPages';
import { User } from './data/firestoreData';

export default function App() {
  const [page, setPage] = useState<PageName>('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  function handleSelectUser(user: User) {
    setSelectedUser(user);
    setPage('user-detail');
  }

  function handleBackFromDetail() {
    setPage('users');
    setSelectedUser(null);
  }

  function handleNavigate(p: PageName) {
    setPage(p);
    if (p !== 'user-detail') setSelectedUser(null);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar currentPage={page} onNavigate={handleNavigate} />
      <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {page === 'overview' && <OverviewPage />}
        {page === 'users' && <UsersPage onSelectUser={handleSelectUser} />}
        {page === 'user-detail' && selectedUser && <UserDetailPage user={selectedUser} onBack={handleBackFromDetail} />}
        {page === 'total' && <TotalPage />}
        {page === 'sessions' && <SessionsPage />}
        {page === 'blocking' && <BlockingPage />}
        {page === 'affirmation' && <AffirmationPage />}
        {page === 'justification' && <JustificationPage />}
      </main>
    </div>
  );
}