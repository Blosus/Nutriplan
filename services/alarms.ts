import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export type Alarm = {
  id: number;
  hour: number;
  minute: number;
  name: string;
  description: string;
  enabled: boolean;
  notifId?: string;
};

type CloudAlarm = {
  id: number;
  hour: number;
  minute: number;
  name: string;
  description: string;
  enabled: boolean;
};

const ALARMS_STORAGE_KEY_PREFIX = "@alarms";
const USERS_COLLECTION = "users";
const ALARMS_SUBCOLLECTION = "alarms";

const buildLocalAlarmsKey = (uid: string) => `${ALARMS_STORAGE_KEY_PREFIX}:${uid}`;

const normalizeAlarm = (alarm: Partial<Alarm>): Alarm => {
  return {
    id: Number(alarm.id ?? Date.now()),
    hour: Number(alarm.hour ?? 0),
    minute: Number(alarm.minute ?? 0),
    name: String(alarm.name ?? ""),
    description: String(alarm.description ?? ""),
    enabled: Boolean(alarm.enabled),
    notifId: typeof alarm.notifId === "string" ? alarm.notifId : undefined,
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
  };
};

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
      JSON.stringify(sortAlarms(alarms.map(normalizeAlarm)))
    );
  } catch (error) {
    console.error("Error writing local alarms:", error);
  }
}

async function readCloudAlarms(uid: string): Promise<Alarm[] | null> {
  try {
    const alarmsRef = collection(db, USERS_COLLECTION, uid, ALARMS_SUBCOLLECTION);
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
    const alarmsRef = collection(db, USERS_COLLECTION, uid, ALARMS_SUBCOLLECTION);
    const snapshot = await getDocs(alarmsRef);
    const nextIds = new Set(alarms.map((alarm) => String(alarm.id)));

    const batch = writeBatch(db);

    for (const alarm of alarms) {
      const alarmRef = doc(db, USERS_COLLECTION, uid, ALARMS_SUBCOLLECTION, String(alarm.id));
      batch.set(
        alarmRef,
        {
          ...toCloudAlarm(alarm),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
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

  if (uid === "guest") {
    return localAlarms;
  }

  const cloudAlarms = await readCloudAlarms(uid);

  if (cloudAlarms) {
    const localNotifMap = new Map(localAlarms.map((alarm) => [alarm.id, alarm.notifId]));
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

export async function saveUserAlarms(uid: string, alarms: Alarm[]): Promise<Alarm[]> {
  const normalized = sortAlarms(alarms.map(normalizeAlarm));

  await writeLocalAlarms(uid, normalized);

  if (uid !== "guest") {
    await writeCloudAlarms(uid, normalized);
  }

  return normalized;
}

export async function deleteUserAlarm(uid: string, alarmId: number): Promise<void> {
  const local = await readLocalAlarms(uid);
  const next = local.filter((alarm) => alarm.id !== alarmId);
  await writeLocalAlarms(uid, next);

  if (uid !== "guest") {
    try {
      const alarmRef = doc(db, USERS_COLLECTION, uid, ALARMS_SUBCOLLECTION, String(alarmId));
      await deleteDoc(alarmRef);
    } catch (error) {
      console.error("Error deleting cloud alarm:", error);
    }
  }
}