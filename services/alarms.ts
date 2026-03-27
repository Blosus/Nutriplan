import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { getUserProfile, updateUserAlarmCount } from "./user-profile";

export type Alarm = {
  id: number;
  hour: number;
  minute: number;
  name: string;
  description: string;
  enabled: boolean;
  weekdays: number[];
  notifId?: string;
  notifIds?: string[];
};

type CloudAlarm = {
  id: number;
  hour: number;
  minute: number;
  name: string;
  description: string;
  enabled: boolean;
  weekdays: number[];
};

export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Dom",
  2: "Lun",
  3: "Mar",
  4: "Mie",
  5: "Jue",
  6: "Vie",
  7: "Sab",
};

const ALARMS_STORAGE_KEY_PREFIX = "@alarms";
const USERS_COLLECTION = "users";
const ALARMS_SUBCOLLECTION = "alarms";

async function canUseCloud(uid: string): Promise<boolean> {
  if (uid === "guest") {
    return false;
  }

  try {
    await auth.authStateReady();
    return auth.currentUser?.uid === uid;
  } catch (error) {
    console.error("Error waiting for auth before cloud alarms access:", error);
    return false;
  }
}

const buildLocalAlarmsKey = (uid: string) =>
  `${ALARMS_STORAGE_KEY_PREFIX}:${uid}`;

const normalizeWeekdays = (input: unknown): number[] => {
  if (!Array.isArray(input)) {
    return [...ALL_WEEKDAYS];
  }

  const normalized = Array.from(
    new Set(
      input
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7),
    ),
  ).sort((a, b) => a - b);

  return normalized.length > 0 ? normalized : [...ALL_WEEKDAYS];
};

const normalizeNotifIds = (input: unknown): string[] | undefined => {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const ids = Array.from(
    new Set(
      input.filter((value) => typeof value === "string" && value.length > 0),
    ),
  );
  return ids.length > 0 ? ids : undefined;
};

const normalizeAlarm = (alarm: Partial<Alarm>): Alarm => {
  return {
    id: Number(alarm.id ?? Date.now()),
    hour: Number(alarm.hour ?? 0),
    minute: Number(alarm.minute ?? 0),
    name: String(alarm.name ?? ""),
    description: String(alarm.description ?? ""),
    enabled: Boolean(alarm.enabled),
    weekdays: normalizeWeekdays(alarm.weekdays),
    notifId: typeof alarm.notifId === "string" ? alarm.notifId : undefined,
    notifIds: normalizeNotifIds(alarm.notifIds),
  };
};

const sortAlarms = (alarms: Alarm[]) => {
  return [...alarms].sort((a, b) => {
    if (a.hour !== b.hour) {
      return a.hour - b.hour;
    }
    return a.minute - b.minute;
  });
};

const toCloudAlarm = (alarm: Alarm): CloudAlarm => {
  return {
    id: alarm.id,
    hour: alarm.hour,
    minute: alarm.minute,
    name: alarm.name,
    description: alarm.description,
    enabled: alarm.enabled,
    weekdays: normalizeWeekdays(alarm.weekdays),
  };
};

export function getAlarmWeekdaysSummary(weekdays: number[]): string {
  const normalized = normalizeWeekdays(weekdays);
  if (normalized.length === 7) {
    return "Todos los dias";
  }
  return normalized.map((day) => WEEKDAY_LABELS[day]).join(", ");
}

export async function cancelAlarmNotifications(alarm: Alarm): Promise<void> {
  const notifIds = Array.from(
    new Set([
      ...(alarm.notifIds ?? []),
      ...(alarm.notifId ? [alarm.notifId] : []),
    ]),
  );

  for (const notifId of notifIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
    } catch {
      // ignore invalid notification ids
    }
  }
}

export async function scheduleAlarmNotifications(
  alarm: Pick<
    Alarm,
    "id" | "hour" | "minute" | "name" | "description" | "weekdays"
  >,
): Promise<{ notifId?: string; notifIds?: string[] }> {
  const normalizedWeekdays = normalizeWeekdays(alarm.weekdays);
  const notifIds: string[] = [];

  for (const weekday of normalizedWeekdays) {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.name || "Alarma",
        body: alarm.description || "¡Es hora!",
        sound: true,
        data: { alarmId: alarm.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: alarm.hour,
        minute: alarm.minute,
      } as any,
    });

    notifIds.push(notifId);
  }

  if (notifIds.length === 0) {
    return {};
  }

  return {
    notifId: notifIds[0],
    notifIds,
  };
}

async function readLocalAlarms(uid: string): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(buildLocalAlarmsKey(uid));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Partial<Alarm>[];
    return sortAlarms(parsed.map(normalizeAlarm));
  } catch (error) {
    console.error("Error reading local alarms:", error);
    return [];
  }
}

async function writeLocalAlarms(uid: string, alarms: Alarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      buildLocalAlarmsKey(uid),
      JSON.stringify(sortAlarms(alarms.map(normalizeAlarm))),
    );
  } catch (error) {
    console.error("Error writing local alarms:", error);
  }
}

async function readCloudAlarms(uid: string): Promise<Alarm[] | null> {
  try {
    const alarmsRef = collection(
      db,
      USERS_COLLECTION,
      uid,
      ALARMS_SUBCOLLECTION,
    );
    const snapshot = await getDocs(alarmsRef);

    const alarms = snapshot.docs.map((item) => {
      const data = item.data() as Partial<CloudAlarm>;
      return normalizeAlarm({
        id: Number(item.id),
        hour: data.hour,
        minute: data.minute,
        name: data.name,
        description: data.description,
        enabled: data.enabled,
        weekdays: data.weekdays,
      });
    });

    return sortAlarms(alarms);
  } catch (error) {
    console.error("Error reading cloud alarms:", error);
    return null;
  }
}

async function writeCloudAlarms(uid: string, alarms: Alarm[]): Promise<void> {
  try {
    const alarmsRef = collection(
      db,
      USERS_COLLECTION,
      uid,
      ALARMS_SUBCOLLECTION,
    );
    const snapshot = await getDocs(alarmsRef);
    const nextIds = new Set(alarms.map((alarm) => String(alarm.id)));

    const batch = writeBatch(db);

    for (const alarm of alarms) {
      const alarmRef = doc(
        db,
        USERS_COLLECTION,
        uid,
        ALARMS_SUBCOLLECTION,
        String(alarm.id),
      );
      batch.set(
        alarmRef,
        {
          ...toCloudAlarm(alarm),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    for (const existingDoc of snapshot.docs) {
      if (!nextIds.has(existingDoc.id)) {
        batch.delete(existingDoc.ref);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error("Error writing cloud alarms:", error);
  }
}

export async function loadUserAlarms(uid: string): Promise<Alarm[]> {
  const localAlarms = await readLocalAlarms(uid);

  if (!(await canUseCloud(uid))) {
    return localAlarms;
  }

  const profile = await getUserProfile(uid);
  if (profile && profile.alarmsCount === 0 && localAlarms.length === 0) {
    return [];
  }

  const cloudAlarms = await readCloudAlarms(uid);

  if (cloudAlarms) {
    const localNotifMap = new Map(
      localAlarms.map((alarm) => [alarm.id, alarm.notifId]),
    );
    const merged = cloudAlarms.map((alarm) => ({
      ...alarm,
      notifId: localNotifMap.get(alarm.id),
    }));

    await writeLocalAlarms(uid, merged);
    return merged;
  }

  if (localAlarms.length > 0) {
    await writeCloudAlarms(uid, localAlarms);
  }

  return localAlarms;
}

export async function saveUserAlarms(
  uid: string,
  alarms: Alarm[],
): Promise<Alarm[]> {
  const normalized = sortAlarms(alarms.map(normalizeAlarm));

  await writeLocalAlarms(uid, normalized);

  if (await canUseCloud(uid)) {
    await writeCloudAlarms(uid, normalized);
    await updateUserAlarmCount(uid, normalized.length);
  }

  return normalized;
}

/**
 * Devuelve las alarmas guardadas localmente sin hacer sync con la nube.
 * Útil para mostrar datos inmediatamente mientras el sync ocurre en segundo plano.
 */
export async function readCachedAlarms(uid: string): Promise<Alarm[]> {
  return readLocalAlarms(uid);
}

export async function deleteUserAlarm(
  uid: string,
  alarmId: number,
): Promise<void> {
  const local = await readLocalAlarms(uid);
  const next = local.filter((alarm) => alarm.id !== alarmId);
  await writeLocalAlarms(uid, next);

  if (await canUseCloud(uid)) {
    try {
      const alarmRef = doc(
        db,
        USERS_COLLECTION,
        uid,
        ALARMS_SUBCOLLECTION,
        String(alarmId),
      );
      await deleteDoc(alarmRef);
      await updateUserAlarmCount(uid, next.length);
    } catch (error) {
      console.error("Error deleting cloud alarm:", error);
    }
  }
}
