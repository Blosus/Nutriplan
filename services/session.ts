import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NutriAppUser } from "./auth";

const SESSION_STORAGE_KEY = "@session_user";

let cachedUser: NutriAppUser | null = null;

export async function getCurrentSessionUser(): Promise<NutriAppUser | null> {
  if (cachedUser) {
    return cachedUser;
  }

  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as NutriAppUser;
    cachedUser = parsed;
    return parsed;
  } catch (error) {
    console.error("Error loading current session user:", error);
    return null;
  }
}

export async function setCurrentSessionUser(user: NutriAppUser): Promise<void> {
  cachedUser = user;
  try {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Error saving current session user:", error);
  }
}

export async function clearCurrentSessionUser(): Promise<void> {
  cachedUser = null;
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing current session user:", error);
  }
}