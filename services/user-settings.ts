import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type AppThemePreference = 'dark' | 'light';
export type VibrationType = 'GENTLE' | 'NORMAL' | 'STRONG' | 'PULSE' | 'WAVE';

export type UserSettings = {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibracionEnabled: boolean;
  vibrationPattern: VibrationType;
  soundName: string;
  soundUri: string | null; // null = usar sonido embebido por defecto
  theme: AppThemePreference;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  vibracionEnabled: true,
  vibrationPattern: 'NORMAL',
  soundName: 'sonidolol.mp3',
  soundUri: null,
  theme: 'dark',
};

const SETTINGS_STORAGE_KEY_PREFIX = "@user_settings";
const USERS_COLLECTION = "users";
const SETTINGS_SUBCOLLECTION = "settings";
const SETTINGS_DOC_ID = "preferences";

async function canUseCloud(uid: string): Promise<boolean> {
  if (uid === "guest") {
    return false;
  }

  try {
    await auth.authStateReady();
    return auth.currentUser?.uid === uid;
  } catch (error) {
    console.error("Error waiting for auth before cloud settings access:", error);
    return false;
  }
}

const buildSettingsStorageKey = (uid: string) => `${SETTINGS_STORAGE_KEY_PREFIX}:${uid}`;

const normalizeSettings = (input?: Partial<UserSettings> | null): UserSettings => {
  return {
    notificationsEnabled:
      input?.notificationsEnabled ?? DEFAULT_USER_SETTINGS.notificationsEnabled,
    soundEnabled: input?.soundEnabled ?? DEFAULT_USER_SETTINGS.soundEnabled,
    vibracionEnabled: input?.vibracionEnabled ?? DEFAULT_USER_SETTINGS.vibracionEnabled,
    vibrationPattern: input?.vibrationPattern ?? DEFAULT_USER_SETTINGS.vibrationPattern,
    soundName: input?.soundName ?? DEFAULT_USER_SETTINGS.soundName,
    soundUri: input?.soundUri ?? DEFAULT_USER_SETTINGS.soundUri,
    theme: input?.theme ?? DEFAULT_USER_SETTINGS.theme,
  };
};

async function readLocalSettings(uid: string): Promise<UserSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(buildSettingsStorageKey(uid));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return normalizeSettings(parsed);
  } catch (error) {
    console.error("Error reading local user settings:", error);
    return null;
  }
}

async function writeLocalSettings(uid: string, settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(
      buildSettingsStorageKey(uid),
      JSON.stringify(normalizeSettings(settings))
    );
  } catch (error) {
    console.error("Error writing local user settings:", error);
  }
}

async function readCloudSettings(uid: string): Promise<UserSettings | null> {
  try {
    const settingsRef = doc(
      db,
      USERS_COLLECTION,
      uid,
      SETTINGS_SUBCOLLECTION,
      SETTINGS_DOC_ID
    );
    const snapshot = await getDoc(settingsRef);

    if (snapshot.exists()) {
      return normalizeSettings(snapshot.data() as Partial<UserSettings>);
    }

    return null;
  } catch (error) {
    console.error("Error reading cloud user settings:", error);
    return null;
  }
}

async function writeCloudSettings(uid: string, settings: UserSettings): Promise<void> {
  try {
    const settingsRef = doc(
      db,
      USERS_COLLECTION,
      uid,
      SETTINGS_SUBCOLLECTION,
      SETTINGS_DOC_ID
    );
    await setDoc(
      settingsRef,
      {
        ...normalizeSettings(settings),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error writing cloud user settings:", error);
  }
}

export async function ensureUserSettingsInitialized(uid: string): Promise<UserSettings> {
  const localSettings = await readLocalSettings(uid);

  if (!(await canUseCloud(uid))) {
    const fallback = localSettings ?? normalizeSettings(DEFAULT_USER_SETTINGS);
    await writeLocalSettings(uid, fallback);
    return fallback;
  }

  const cloudSettings = await readCloudSettings(uid);
  if (cloudSettings) {
    await writeLocalSettings(uid, cloudSettings);
    return cloudSettings;
  }

  const defaults = localSettings ?? normalizeSettings(DEFAULT_USER_SETTINGS);
  await writeLocalSettings(uid, defaults);
  await writeCloudSettings(uid, defaults);
  return defaults;
}

export async function loadUserSettings(uid: string): Promise<UserSettings> {
  return ensureUserSettingsInitialized(uid);
}

export async function saveUserSettings(
  uid: string,
  settings: UserSettings
): Promise<UserSettings> {
  const normalized = normalizeSettings(settings);

  await writeLocalSettings(uid, normalized);

  if (await canUseCloud(uid)) {
    await writeCloudSettings(uid, normalized);
  }

  return normalized;
}

export async function saveUserThemePreference(
  uid: string,
  theme: AppThemePreference
): Promise<UserSettings> {
  const currentSettings = await ensureUserSettingsInitialized(uid);

  return saveUserSettings(uid, {
    ...currentSettings,
    theme,
  });
}