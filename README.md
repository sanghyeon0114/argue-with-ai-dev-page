# Firestore Admin Dashboard

Firestore 구조를 기반으로 한 React 관리자 대시보드입니다.

## 파일 구조

```
src/
├── App.tsx                        # 루트 컴포넌트, 페이지 라우팅
├── components/
│   ├── Sidebar.tsx                # 좌측 네비게이션
│   └── ui.tsx                     # 공통 UI 컴포넌트 (Badge, Card, DataTable 등)
├── data/
│   └── mockData.ts                # Mock 데이터 및 타입 정의
└── pages/
    ├── OverviewPage.tsx           # 대시보드 메인 + PageHeader 컴포넌트
    ├── UsersPage.tsx              # Users 목록 + UserDetail (탭 포함)
    └── CollectionPages.tsx        # Sessions / Blocking / Affirmation / Justification
```

## 설치 및 실행

```bash
npx create-react-app my-admin --template typescript
cd my-admin

# src/ 안의 파일들을 이 프로젝트의 src/로 복사
cp -r admin-dashboard/src/* src/

npm start
```

## Firestore 연동

`src/data/mockData.ts`의 Mock 함수들을 실제 Firestore 호출로 교체하세요.

```typescript
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // firebaseConfig 설정 필요

// 예시: users 컬렉션 전체 조회
export async function fetchUsers() {
  const usersSnap = await getDocs(collection(db, 'users'));
  return usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// 예시: 특정 유저의 profiles > userInfo 문서 조회
export async function fetchUserInfo(userId: string) {
  const ref = doc(db, 'users', userId, 'profiles', 'userInfo');
  const snap = await getDoc(ref);
  return snap.data();
}

// 예시: 특정 유저의 sessions 컬렉션 조회
export async function fetchUserSessions(userId: string) {
  const snap = await getDocs(collection(db, 'users', userId, 'sessions'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
```

## 컴포넌트 요약

| 컴포넌트 | 설명 |
|---|---|
| `Badge` | 색상 배지 (success/danger/info/warn/gray) |
| `BoolBadge` | boolean 값을 배지로 표시 |
| `MetricCard` | 대시보드 통계 카드 |
| `Card` | 일반 카드 컨테이너 |
| `FieldRow` | key-value 행 (상세 보기용) |
| `DataTable<T>` | 제네릭 테이블, 클릭 이벤트 지원 |
| `ScoreBar` | justification score 시각화 바 |
| `UsageBar` | 앱 사용량 바 |
