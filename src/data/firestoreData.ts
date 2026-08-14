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
  interventionType: number | null;
  accessibilityEnabled: boolean;
  updatedAt: string;
}

// FirestoreInterventionRepository.setInterventionType / Prompt.kt의 when(interventionType) 분기 참고
// 0 → BlockingActivity(blocking), 1 → RuleBasedChatbotActivity(affirmation), 2 → LlmChatbotActivity(justification)
export const INTERVENTION_TYPE_LABELS: Record<number, string> = {
  0: 'Blocking',
  1: 'Affirmation',
  2: 'Justification',
};

export function interventionTypeLabel(type: number | null): string {
  if (type === null || type === undefined) return '미설정';
  return INTERVENTION_TYPE_LABELS[type] ?? `type ${type}`;
}

export interface InterventionState {
  enabled: boolean;
  type: number | null;
  updatedAt: string;
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

// FirestoreBlockingRepository/FirestoreAffirmationRepository/FirestoreJustificationRepository의
// logStart()가 세션 시작 시점에 기록하는 필드. Total 타임라인 정렬 기준(atMs)으로 사용한다.
export interface StartData {
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
  // 이 세션 문서가 실제로 들어있는 서브컬렉션 이름(instagram_sessions/youtube_sessions/sessions).
  // screens/keyboard 하위 컬렉션을 읽으려면 어느 컬렉션 밑에 있는지 알아야 한다.
  sourceCollection: string;
}

export interface ScreenUsage {
  id: string;
  screen: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  startEpoch: number;
  endEpoch: number;
  order: number;
}

export interface KeyboardUsage {
  id: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  startEpoch: number;
  endEpoch: number;
  order: number;
}

export interface BlockingDoc {
  id: string;
  messages: BlockingMessage[];
  start: StartData | null;
  exit: ExitData | null;
}

export interface AffirmationDoc {
  id: string;
  messages: AffirmationMessage[];
  start: StartData | null;
  exit: ExitData | null;
}

export interface JustificationDoc {
  id: string;
  messages: JustificationMessage[];
  start: StartData | null;
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

function mapExit(raw: any): ExitData | null {
  return raw ? { ...raw, at: toDateStr(raw.at) } as ExitData : null;
}

function mapStart(raw: any): StartData | null {
  return raw ? { ...raw, at: toDateStr(raw.at) } as StartData : null;
}

// 세션은 앱 종류에 따라 서로 다른 하위 컬렉션에 저장된다.
// (FirestoreSessionRepository.sessionsCollectionName 참고: instagram → instagram_sessions,
//  youtube → youtube_sessions, 그 외 → sessions)
const SESSION_COLLECTIONS = ['instagram_sessions', 'youtube_sessions', 'sessions'] as const;

function mapSessionDoc(d: { id: string; data: () => any }, sourceCollection: string): Session {
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
    sourceCollection,
  };
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
        interventionType: intervention.type ?? null,
      } as User;
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// userInfo / accessibility / intervention
// FirestoreUserRepository, FirestoreAccessibilityRepository, FirestoreInterventionRepository는
// 모두 별도 하위 컬렉션이 아니라 users/{uid} 문서 자체에 필드(userInfo/accessibility/intervention)를
// merge로 저장한다. 하위 컬렉션이 아니므로 doc(db, 'users', userId)에서 바로 읽어야 한다.
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUserInfo(userId: string) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.data()?.userInfo ?? {};
}

export async function fetchAccessibility(userId: string) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.data()?.accessibility ?? {};
}

export async function fetchInterventionState(userId: string): Promise<InterventionState | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  const intervention = snap.data()?.intervention;
  if (!intervention) return null;
  return {
    enabled: intervention.enabled ?? false,
    type: intervention.type ?? null,
    updatedAt: toDateStr(intervention.updatedAt),
  };
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
      const data = blockDoc.data();

      return {
        id: blockDoc.id,
        messages: messagesSnap.docs.map(m => ({
          id: m.id,
          ...m.data(),
          updatedAt: toDateStr(m.data().updatedAt),
        } as BlockingMessage)),
        start: mapStart(data.start ?? null),
        exit: mapExit(data.exit ?? null),
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

      const data = affDoc.data();

      return {
        id: affDoc.id,
        messages: messagesSnap.docs.map(m => ({
          id: m.id,
          ...m.data(),
          updatedAt: toDateStr(m.data().updatedAt),
        } as AffirmationMessage)),
        start: mapStart(data.start ?? null),
        exit: mapExit(data.exit ?? null),
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

      const data = justDoc.data();

      return {
        id: justDoc.id,
        messages: messagesSnap.docs.map(m => ({
          id: m.id,
          ...m.data(),
          updatedAt: toDateStr(m.data().updatedAt),
        } as JustificationMessage)),
        start: mapStart(data.start ?? null),
        exit: mapExit(data.exit ?? null),
      };
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// sessions 컬렉션
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUserSessions(userId: string): Promise<Session[]> {
  const results = await Promise.all(
    SESSION_COLLECTIONS.map(async col => {
      const snap = await getDocs(query(collection(db, 'users', userId, col), orderBy('startEpoch', 'desc')));
      return snap.docs.map(d => mapSessionDoc(d, col));
    })
  );
  return results
    .flat()
    .sort((a, b) => (b.startEpoch ?? 0) - (a.startEpoch ?? 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// 세션 상세: screens / keyboard 하위 컬렉션
// (FirestoreSessionRepository.screensCollection / keyboardCollection 참고)
// order 필드(1부터 증가하는 문서 ID)가 아니라 startEpoch 기준으로 시간순 정렬한다.
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSessionScreens(userId: string, sourceCollection: string, sessionId: string): Promise<ScreenUsage[]> {
  const snap = await getDocs(
    query(collection(db, 'users', userId, sourceCollection, sessionId, 'screens'), orderBy('startEpoch', 'asc'))
  );
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      screen: data.screen ?? '',
      durationMs: data.durationMs ?? 0,
      startTime: toDateStr(data.startTime),
      endTime: toDateStr(data.endTime),
      startEpoch: data.startEpoch ?? 0,
      endEpoch: data.endEpoch ?? 0,
      order: data.order ?? 0,
    } as ScreenUsage;
  });
}

export async function fetchSessionKeyboard(userId: string, sourceCollection: string, sessionId: string): Promise<KeyboardUsage[]> {
  const snap = await getDocs(
    query(collection(db, 'users', userId, sourceCollection, sessionId, 'keyboard'), orderBy('startEpoch', 'asc'))
  );
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      durationMs: data.durationMs ?? 0,
      startTime: toDateStr(data.startTime),
      endTime: toDateStr(data.endTime),
      startEpoch: data.startEpoch ?? 0,
      endEpoch: data.endEpoch ?? 0,
      order: data.order ?? 0,
    } as KeyboardUsage;
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
      const snaps = await Promise.all(
        SESSION_COLLECTIONS.map(col => getDocs(collection(db, 'users', userDoc.id, col)))
      );
      snaps.forEach((sessionsSnap, i) => {
        const col = SESSION_COLLECTIONS[i];
        sessionsSnap.docs.forEach(s => {
          results.push({ ...mapSessionDoc(s, col), userId: userDoc.id, userName });
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
          const data = blockDoc.data();

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
            start: mapStart(data.start ?? null),
            exit: mapExit(data.exit ?? null),
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
          const data = affDoc.data();

          results.push({
            id: affDoc.id,
            userId: userDoc.id,
            userName,
            messages: messagesSnap.docs.map(m => ({
              id: m.id,
              ...m.data(),
              updatedAt: toDateStr(m.data().updatedAt),
            } as AffirmationMessage)),
            start: mapStart(data.start ?? null),
            exit: mapExit(data.exit ?? null),
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
          const data = justDoc.data();

          results.push({
            id: justDoc.id,
            userId: userDoc.id,
            userName,
            messages: messagesSnap.docs.map(m => ({
              id: m.id,
              ...m.data(),
              updatedAt: toDateStr(m.data().updatedAt),
            } as JustificationMessage)),
            start: mapStart(data.start ?? null),
            exit: mapExit(data.exit ?? null),
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
        interventionType: intervention.type ?? null,
      } as User;
    });
    onData(users);
  });
}

export function subscribeAllSessions(onData: (sessions: (Session & { userId: string; userName: string })[]) => void): Unsubscribe {
  let innerUnsubscribes: Unsubscribe[] = [];

  const outer = onSnapshot(collection(db, 'users'), (usersSnap) => {
    innerUnsubscribes.forEach(u => u());
    innerUnsubscribes = [];

    // userId -> (collection -> sessions), merged and re-emitted on every update
    const userColBuckets = new Map<string, Map<string, (Session & { userId: string; userName: string })[]>>();

    function emit() {
      const merged = Array.from(userColBuckets.values())
        .flatMap(colBuckets => Array.from(colBuckets.values()).flat())
        .sort((a, b) => (b.startEpoch ?? 0) - (a.startEpoch ?? 0));
      onData(merged);
    }

    usersSnap.docs.forEach(userDoc => {
      const userName = userDoc.data().userInfo?.name ?? userDoc.id;
      const colBuckets = new Map<string, (Session & { userId: string; userName: string })[]>();
      userColBuckets.set(userDoc.id, colBuckets);

      SESSION_COLLECTIONS.forEach(col => {
        const inner = onSnapshot(
          query(collection(db, 'users', userDoc.id, col), orderBy('startEpoch', 'desc')),
          (sessionsSnap) => {
            colBuckets.set(col, sessionsSnap.docs.map(s => ({ ...mapSessionDoc(s, col), userId: userDoc.id, userName })));
            emit();
          }
        );
        innerUnsubscribes.push(inner);
      });
    });
  });

  return () => { innerUnsubscribes.forEach(u => u()); outer(); };
}

export function subscribeUserSessions(userId: string, onData: (sessions: Session[]) => void): Unsubscribe {
  const buckets = new Map<string, Session[]>();

  const unsubs = SESSION_COLLECTIONS.map(col =>
    onSnapshot(
      query(collection(db, 'users', userId, col), orderBy('startEpoch', 'desc')),
      (snap) => {
        buckets.set(col, snap.docs.map(d => mapSessionDoc(d, col)));
        const merged = Array.from(buckets.values())
          .flat()
          .sort((a, b) => (b.startEpoch ?? 0) - (a.startEpoch ?? 0));
        onData(merged);
      }
    )
  );

  return () => unsubs.forEach(u => u());
}

export function subscribeBlockingDocs(userId: string, onData: (docs: BlockingDoc[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', userId, 'blocking'), async (blockingSnap) => {
    const results = await Promise.all(
      blockingSnap.docs.map(async (blockDoc) => {
        const messagesSnap = await getDocs(
          query(collection(db, 'users', userId, 'blocking', blockDoc.id, 'messages'), orderBy('updatedAtMs', 'asc'))
        );
        const data = blockDoc.data();
        return {
          id: blockDoc.id,
          messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as BlockingMessage)),
          start: mapStart(data.start ?? null),
          exit: mapExit(data.exit ?? null),
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
        const data = affDoc.data();
        return {
          id: affDoc.id,
          messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as AffirmationMessage)),
          start: mapStart(data.start ?? null),
          exit: mapExit(data.exit ?? null),
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
        const data = justDoc.data();
        return {
          id: justDoc.id,
          messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as JustificationMessage)),
          start: mapStart(data.start ?? null),
          exit: mapExit(data.exit ?? null),
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
            const data = blockDoc.data();
            results.push({
              id: blockDoc.id, userId: userDoc.id, userName, updatedAt,
              messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as BlockingMessage)),
              start: mapStart(data.start ?? null),
              exit: mapExit(data.exit ?? null),
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
            const data = affDoc.data();
            results.push({
              id: affDoc.id, userId: userDoc.id, userName,
              messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as AffirmationMessage)),
              start: mapStart(data.start ?? null),
              exit: mapExit(data.exit ?? null),
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
            const data = justDoc.data();
            results.push({
              id: justDoc.id, userId: userDoc.id, userName,
              messages: messagesSnap.docs.map(m => ({ id: m.id, ...m.data(), updatedAt: toDateStr(m.data().updatedAt) } as JustificationMessage)),
              start: mapStart(data.start ?? null),
              exit: mapExit(data.exit ?? null),
            });
          })
        );
      })
    );
    onData(results);
  });
}