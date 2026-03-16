import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NutriAppUser } from "./auth";

const SESSION_STORAGE_KEY = "@session_user";
const POST_REGISTER_REDIRECT_KEY = "@post_register_redirect_to_login";

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

export async function setPendingLoginRedirectAfterRegister(): Promise<void> {
  try {
    await AsyncStorage.setItem(POST_REGISTER_REDIRECT_KEY, "true");
  } catch (error) {
    console.error("Error saving post-register redirect flag:", error);
  }
}

export async function hasPendingLoginRedirectAfterRegister(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(POST_REGISTER_REDIRECT_KEY);
    return value === "true";
  } catch (error) {
    console.error("Error loading post-register redirect flag:", error);
    return false;
  }
}

export async function clearPendingLoginRedirectAfterRegister(): Promise<void> {
  try {
    await AsyncStorage.removeItem(POST_REGISTER_REDIRECT_KEY);
  } catch (error) {
    console.error("Error clearing post-register redirect flag:", error);
  }
}