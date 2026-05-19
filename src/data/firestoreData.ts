import { collection, getDocs, doc, getDoc, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Device {
  manufacturer: string;
  model: string;
  sdkInt: number;
}

export interface User {
  id: string;
  name: string;
  device: Device;
  interventionEnabled: boolean;
  accessibilityEnabled: boolean;
  updatedAt: string;
}

export interface InterventionHistory {
  id: string;
  enabled: boolean;
  updatedAt: string;
  updatedAtMs: number;
}

export interface BlockingMessage {
  id: string;
  message: string;
  updatedAt: string;
  updatedAtMs: number;
}

export interface AffirmationMessage {
  id: string;
  question: string;
  answer: string;
  updatedAt: string;
  updatedAtMs: number;
}

export interface ExitData {
  finished: boolean;
  method: string;
  note: string;
  at: string;
  atMs: number;
}

export interface JustificationMessage {
  id: string;
  order: number;
  questionIdx: number;
  question: string;
  answer: string;
  score: boolean;
  updatedAt: string;
  updatedAtMs: number;
}

export interface Session {
  id: string;
  app: string;
  day: string;
  durationSec: number;
  startTime: string;
  startEpoch: number;
  endTime: string;
  endEpoch: number;
}

export interface BlockingDoc {
  id: string;
  messages: BlockingMessage[];
  exit: ExitData | null;
}

export interface AffirmationDoc {
  id: string;
  messages: AffirmationMessage[];
  exit: ExitData | null;
}

export interface JustificationDoc {
  id: string;
  messages: JustificationMessage[];
  exit: ExitData | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function fmtSec(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}분 ${sec}초`;
}
function toDateStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  // Firestore Timestamp: { seconds, nanoseconds }
  if (typeof val === 'object' && 'seconds' in val) {
    return new Date(val.seconds * 1000).toLocaleString('ko-KR');
  }
  if (val instanceof Date) return val.toLocaleString('ko-KR');
  return String(val);
}

// ─────────────────────────────────────────────────────────────────────────────
// users 컬렉션
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<User[]> {
  const usersSnap = await getDocs(collection(db, 'users'));

  return Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const data = userDoc.data();
      const userInfo      = data.userInfo      ?? {};
      const accessibility = data.accessibility  ?? {};
      const intervention  = data.intervention   ?? {};

      return {
        id: userDoc.id,
        name: userInfo.name ?? userDoc.id,
        updatedAt: toDateStr(userInfo.updatedAt),
        device: accessibility.device ?? { manufacturer: '', model: '', sdkInt: 0 },
        accessibilityEnabled: accessibility.enabled ?? false,
        interventionEnabled: intervention.enabled ?? false,
      } as User;
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// profiles 하위 문서
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUserInfo(userId: string) {
  const snap = await getDoc(doc(db, 'users', userId, 'profiles', 'userInfo'));
  return snap.data() ?? {};
}

export async function fetchAccessibility(userId: string) {
  const snap = await getDoc(doc(db, 'users', userId, 'profiles', 'accessibility'));
  return snap.data() ?? {};
}

export async function fetchInterventionHistory(userId: string): Promise<InterventionHistory[]> {
  const snap = await getDocs(
    query(collection(db, 'users', userId, 'profiles', 'intervention', 'history'), orderBy('updatedAtMs', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as InterventionHistory));
}

// ─────────────────────────────────────────────────────────────────────────────
// blocking 컬렉션
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchBlockingDocs(userId: string): Promise<BlockingDoc[]> {
  const blockingSnap = await getDocs(collection(db, 'users', userId, 'blocking'));

  return Promise.all(
    blockingSnap.docs.map(async (blockDoc) => {
      const messagesSnap = await getDocs(
        query(collection(db, 'users', userId, 'blocking', blockDoc.id, 'messages'), orderBy('updatedAtMs', 'asc'))
      );
      const rawExit = blockDoc.data().exit ?? null;

      return {
        id: blockDoc.id,
        messages: messagesSnap.docs.map(m => ({
          id: m.id,
          ...m.data(),
          updatedAt: toDateStr(m.data().updatedAt),
        } as BlockingMessage)),
        exit: rawExit ? {
          ...rawExit,
          at: toDateStr(rawExit.at),
        } as ExitData : null,
      };
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// affirmation 컬렉션
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAffirmationDocs(userId: string): Promise<AffirmationDoc[]> {
  const affSnap = await getDocs(collection(db, 'users', userId, 'affirmation'));

  return Promise.all(
    affSnap.docs.map(async (affDoc) => {
      const messagesSnap = await getDocs(
        query(collection(db, 'users', userId, 'affirmation', affDoc.id, 'messages'), orderBy('updatedAtMs', 'asc'))
      );

      const rawExit = affDoc.data().exit ?? null;

      return {
        id: affDoc.id,
        messages: messagesSnap.docs.map(m => ({
          id: m.id,
          ...m.data(),
          updatedAt: toDateStr(m.data().updatedAt),
        } as AffirmationMessage)),
        exit: rawExit ? {
          ...rawExit,
          at: toDateStr(rawExit.at),
        } as ExitData : null,
      };
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// justification 컬렉션
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchJustificationDocs(userId: string): Promise<JustificationDoc[]> {
  const justSnap = await getDocs(collection(db, 'users', userId, 'justification'));

  return Promise.all(
    justSnap.docs.map(async (justDoc) => {
      const messagesSnap = await getDocs(
        query(collection(db, 'users', userId, 'justification', justDoc.id, 'messages'), orderBy('order', 'asc'))
      );

      const rawExit = justDoc.data().exit ?? null;

      return {
        id: justDoc.id,
        messages: messagesSnap.docs.map(m => ({
          id: m.id,
          ...m.data(),
          updatedAt: toDateStr(m.data().updatedAt),
        } as JustificationMessage)),
        exit: rawExit ? {
          ...rawExit,
          at: toDateStr(rawExit.at),
        } as ExitData : null,
      };
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// sessions 컬렉션
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUserSessions(userId: string): Promise<Session[]> {
  const snap = await getDocs(
    query(collection(db, 'users', userId, 'sessions'), orderBy('startEpoch', 'desc'))
  );
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      app: data.app ?? '',
      day: toDateStr(data.day),
      durationSec: data.durationSec ?? 0,
      startTime: toDateStr(data.startTime),
      startEpoch: data.startEpoch ?? 0,
      endTime: toDateStr(data.endTime),
      endEpoch: data.endEpoch ?? 0,
    } as Session;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 전체 컬렉션 집계 (Overview / 컬렉션 페이지용)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAllSessions(): Promise<(Session & { userId: string; userName: string })[]> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const results: (Session & { userId: string; userName: string })[] = [];

  await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const userName = userDoc.data().userInfo?.name ?? userDoc.id;
      const sessionsSnap = await getDocs(collection(db, 'users', userDoc.id, 'sessions'));
      sessionsSnap.docs.forEach(s => {
        const data = s.data();
        results.push({
          id: s.id,
          userId: userDoc.id,
          userName,
          app: data.app ?? '',
          day: toDateStr(data.day),
          durationSec: data.durationSec ?? 0,
          startTime: toDateStr(data.startTime),
          startEpoch: data.startEpoch ?? 0,
          endTime: toDateStr(data.endTime),
          endEpoch: data.endEpoch ?? 0,
        });
      });
    })
  );

  return results.sort((a, b) => (b.startEpoch ?? 0) - (a.startEpoch ?? 0));
}

export async function fetchAllBlocking(): Promise<(BlockingDoc & { userId: string; userName: string; updatedAt: string })[]> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const results: (BlockingDoc & { userId: string; userName: string; updatedAt: string })[] = [];

  await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const userName  = userDoc.data().userInfo?.name      ?? userDoc.id;
      const updatedAt = toDateStr(userDoc.data().userInfo?.updatedAt);

      const blockingSnap = await getDocs(collection(db, 'users', userDoc.id, 'blocking'));
      await Promise.all(
        blockingSnap.docs.map(async (blockDoc) => {
          const messagesSnap = await getDocs(collection(db, 'users', userDoc.id, 'blocking', blockDoc.id, 'messages'));
          const rawExit = blockDoc.data().exit ?? null;

          results.push({
            id: blockDoc.id,
            userId: userDoc.id,
            userName,
            updatedAt,
            messages: messagesSnap.docs.map(m => ({
              id: m.id,
              ...m.data(),
              updatedAt: toDateStr(m.data().updatedAt),
            } as BlockingMessage)),
            exit: rawExit ? {
              ...rawExit,
              at: toDateStr(rawExit.at),
            } as ExitData : null,
          });
        })
      );
    })
  );

  return results;
}

export async function fetchAllAffirmation(): Promise<(AffirmationDoc & { userId: string; userName: string })[]> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const results: (AffirmationDoc & { userId: string; userName: string })[] = [];

  await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const userName = userDoc.data().userInfo?.name ?? userDoc.id;
      const affSnap = await getDocs(collection(db, 'users', userDoc.id, 'affirmation'));

      await Promise.all(
        affSnap.docs.map(async (affDoc) => {
          const messagesSnap = await getDocs(collection(db, 'users', userDoc.id, 'affirmation', affDoc.id, 'messages'));
          const rawExit = affDoc.data().exit ?? null;

          results.push({
            id: affDoc.id,
            userId: userDoc.id,
            userName,
            messages: messagesSnap.docs.map(m => ({
              id: m.id,
              ...m.data(),
              updatedAt: toDateStr(m.data().updatedAt),
            } as AffirmationMessage)),
            exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
          });
        })
      );
    })
  );

  return results;
}

export async function fetchAllJustification(): Promise<(JustificationDoc & { userId: string; userName: string })[]> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const results: (JustificationDoc & { userId: string; userName: string })[] = [];

  await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const userName = userDoc.data().userInfo?.name ?? userDoc.id;
      const justSnap = await getDocs(collection(db, 'users', userDoc.id, 'justification'));

      await Promise.all(
        justSnap.docs.map(async (justDoc) => {
          const messagesSnap = await getDocs(collection(db, 'users', userDoc.id, 'justification', justDoc.id, 'messages'));
          const rawExit = justDoc.data().exit ?? null;

          results.push({
            id: justDoc.id,
            userId: userDoc.id,
            userName,
            messages: messagesSnap.docs.map(m => ({
              id: m.id,
              ...m.data(),
              updatedAt: toDateStr(m.data().updatedAt),
            } as JustificationMessage)),
            exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
          });
        })
      );
    })
  );

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-time listeners
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeUsers(onData: (users: User[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), async (snap) => {
    const users = snap.docs.map(userDoc => {
      const data = userDoc.data();
      const userInfo      = data.userInfo      ?? {};
      const accessibility = data.accessibility  ?? {};
      const intervention  = data.intervention   ?? {};
      return {
        id: userDoc.id,
        name: userInfo.name ?? userDoc.id,
        updatedAt: toDateStr(userInfo.updatedAt),
        device: accessibility.device ?? { manufacturer: '', model: '', sdkInt: 0 },
        accessibilityEnabled: accessibility.enabled ?? false,
        interventionEnabled: intervention.enabled ?? false,
      } as User;
    });
    onData(users);
  });
}

export function subscribeAllSessions(onData: (sessions: (Session & { userId: string; userName: string })[]) => void): Unsubscribe {
  const unsubscribes: Unsubscribe[] = [];

  const outer = onSnapshot(collection(db, 'users'), (usersSnap) => {
    unsubscribes.slice(1).forEach(u => u());

    const allSessions: (Session & { userId: string; userName: string })[] = [];
    const userMap = new Map<string, (Session & { userId: string; userName: string })[]>();

    usersSnap.docs.forEach(userDoc => {
      const userName = userDoc.data().userInfo?.name ?? userDoc.id;
      userMap.set(userDoc.id, []);

      const inner = onSnapshot(
        query(collection(db, 'users', userDoc.id, 'sessions'), orderBy('startEpoch', 'desc')),
        (sessionsSnap) => {
          const sessions = sessionsSnap.docs.map(s => {
            const data = s.data();
            return {
              id: s.id, userId: userDoc.id, userName,
              app: data.app ?? '',
              day: toDateStr(data.day),
              durationSec: data.durationSec ?? 0,
              startTime: toDateStr(data.startTime),
              startEpoch: data.startEpoch ?? 0,
              endTime: toDateStr(data.endTime),
              endEpoch: data.endEpoch ?? 0,
            };
          });
          userMap.set(userDoc.id, sessions);

          const merged = Array.from(userMap.values())
            .flat()
            .sort((a, b) => (b.startEpoch ?? 0) - (a.startEpoch ?? 0));
          onData(merged);
        }
      );
      unsubscribes.push(inner);
    });
  });

  unsubscribes.unshift(outer);
  return () => unsubscribes.forEach(u => u());
}

export function subscribeUserSessions(userId: string, onData: (sessions: Session[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'users', userId, 'sessions'), orderBy('startEpoch', 'desc')),
    (snap) => {
      onData(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          app: data.app ?? '',
          day: toDateStr(data.day),
          durationSec: data.durationSec ?? 0,
          startTime: toDateStr(data.startTime),
          startEpoch: data.startEpoch ?? 0,
          endTime: toDateStr(data.endTime),
          endEpoch: data.endEpoch ?? 0,
        } as Session;
      }));
    }
  );
}

export function subscribeBlockingDocs(userId: string, onData: (docs: BlockingDoc[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', userId, 'blocking'), async (blockingSnap) => {
    const results = await Promise.all(
      blockingSnap.docs.map(async (blockDoc) => {
        const messagesSnap = await getDocs(
          query(collection(db, 'users', userId, 'blocking', blockDoc.id, 'messages'), orderBy('updatedAtMs', 'asc'))
        );
        const rawExit = blockDoc.data().exit ?? null;
        return {
          id: blockDoc.id,
          messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as BlockingMessage)),
          exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
        };
      })
    );
    onData(results);
  });
}

export function subscribeAffirmationDocs(userId: string, onData: (docs: AffirmationDoc[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', userId, 'affirmation'), async (affSnap) => {
    const results = await Promise.all(
      affSnap.docs.map(async (affDoc) => {
        const messagesSnap = await getDocs(
          query(collection(db, 'users', userId, 'affirmation', affDoc.id, 'messages'), orderBy('updatedAtMs', 'asc'))
        );
        const rawExit = affDoc.data().exit ?? null;
        return {
          id: affDoc.id,
          messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as AffirmationMessage)),
          exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
        };
      })
    );
    onData(results);
  });
}

export function subscribeJustificationDocs(userId: string, onData: (docs: JustificationDoc[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', userId, 'justification'), async (justSnap) => {
    const results = await Promise.all(
      justSnap.docs.map(async (justDoc) => {
        const messagesSnap = await getDocs(
          query(collection(db, 'users', userId, 'justification', justDoc.id, 'messages'), orderBy('order', 'asc'))
        );
        const rawExit = justDoc.data().exit ?? null;
        return {
          id: justDoc.id,
          messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as JustificationMessage)),
          exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
        };
      })
    );
    onData(results);
  });
}

export function subscribeAllBlocking(onData: (docs: (BlockingDoc & { userId: string; userName: string; updatedAt: string })[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), async (usersSnap) => {
    const results: (BlockingDoc & { userId: string; userName: string; updatedAt: string })[] = [];
    await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        const userName  = userDoc.data().userInfo?.name ?? userDoc.id;
        const updatedAt = toDateStr(userDoc.data().userInfo?.updatedAt);
        const blockingSnap = await getDocs(collection(db, 'users', userDoc.id, 'blocking'));
        await Promise.all(
          blockingSnap.docs.map(async (blockDoc) => {
            const messagesSnap = await getDocs(collection(db, 'users', userDoc.id, 'blocking', blockDoc.id, 'messages'));
            const rawExit = blockDoc.data().exit ?? null;
            results.push({
              id: blockDoc.id, userId: userDoc.id, userName, updatedAt,
              messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as BlockingMessage)),
              exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
            });
          })
        );
      })
    );
    onData(results);
  });
}

export function subscribeAllAffirmation(onData: (docs: (AffirmationDoc & { userId: string; userName: string })[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), async (usersSnap) => {
    const results: (AffirmationDoc & { userId: string; userName: string })[] = [];
    await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        const userName = userDoc.data().userInfo?.name ?? userDoc.id;
        const affSnap  = await getDocs(collection(db, 'users', userDoc.id, 'affirmation'));
        await Promise.all(
          affSnap.docs.map(async (affDoc) => {
            const messagesSnap = await getDocs(collection(db, 'users', userDoc.id, 'affirmation', affDoc.id, 'messages'));
            const rawExit = affDoc.data().exit ?? null;
            results.push({
              id: affDoc.id, userId: userDoc.id, userName,
              messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as AffirmationMessage)),
              exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
            });
          })
        );
      })
    );
    onData(results);
  });
}

export function subscribeAllJustification(onData: (docs: (JustificationDoc & { userId: string; userName: string })[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), async (usersSnap) => {
    const results: (JustificationDoc & { userId: string; userName: string })[] = [];
    await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        const userName  = userDoc.data().userInfo?.name ?? userDoc.id;
        const justSnap  = await getDocs(collection(db, 'users', userDoc.id, 'justification'));
        await Promise.all(
          justSnap.docs.map(async (justDoc) => {
            const messagesSnap = await getDocs(collection(db, 'users', userDoc.id, 'justification', justDoc.id, 'messages'));
            const rawExit = justDoc.data().exit ?? null;
            results.push({
              id: justDoc.id, userId: userDoc.id, userName,
              messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as JustificationMessage)),
              exit: rawExit ? { ...rawExit, at: toDateStr(rawExit.at) } as ExitData : null,
            });
          })
        );
      })
    );
    onData(results);
  });
}