import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type DietGoal = "LOSE_WEIGHT" | "MAINTAIN_WEIGHT";
export type DietGender = "MALE" | "FEMALE";
export type DietActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "ACTIVE"
  | "EXTREME";

export type MealTime = { hour: number; minute: number };

export type DietMealSchedule = {
  breakfast: MealTime;
  midMorning: MealTime;
  lunch: MealTime;
  afternoon: MealTime;
  dinner: MealTime;
};

export type DietMealEnabled = {
  breakfast: boolean;
  midMorning: boolean;
  lunch: boolean;
  afternoon: boolean;
  dinner: boolean;
};

export type DietProfile = {
  goal: DietGoal | null;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  gender: DietGender | null;
  activityLevel: DietActivityLevel | null;
  recommendedCalories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatsGrams: number | null;
  mealSchedule: DietMealSchedule;
  mealEnabled: DietMealEnabled;
  completedSteps: number;
  setupCompleted: boolean;
};

export const DEFAULT_DIET_PROFILE: DietProfile = {
  goal: null,
  weightKg: null,
  heightCm: null,
  age: null,
  gender: null,
  activityLevel: null,
  recommendedCalories: null,
  proteinGrams: null,
  carbsGrams: null,
  fatsGrams: null,
  mealSchedule: {
    breakfast: { hour: 8, minute: 0 },
    midMorning: { hour: 11, minute: 0 },
    lunch: { hour: 13, minute: 0 },
    afternoon: { hour: 17, minute: 0 },
    dinner: { hour: 20, minute: 0 },
  },
  mealEnabled: {
    breakfast: true,
    midMorning: true,
    lunch: true,
    afternoon: true,
    dinner: true,
  },
  completedSteps: 0,
  setupCompleted: false,
};

const PROFILE_STORAGE_KEY_PREFIX = "@diet_profile";
const USERS_COLLECTION = "users";
const DIET_SUBCOLLECTION = "diet";
const DIET_PROFILE_DOC_ID = "profile";

const buildProfileStorageKey = (uid: string) =>
  `${PROFILE_STORAGE_KEY_PREFIX}:${uid}`;

function normalizeMealSchedule(
  input?: Partial<DietMealSchedule> | null,
): DietMealSchedule {
  const def = DEFAULT_DIET_PROFILE.mealSchedule;
  return {
    breakfast: input?.breakfast ?? def.breakfast,
    midMorning: input?.midMorning ?? def.midMorning,
    lunch: input?.lunch ?? def.lunch,
    afternoon: input?.afternoon ?? def.afternoon,
    dinner: input?.dinner ?? def.dinner,
  };
}

function normalizeMealEnabled(
  input?: Partial<DietMealEnabled> | null,
): DietMealEnabled {
  const def = DEFAULT_DIET_PROFILE.mealEnabled;
  return {
    breakfast: input?.breakfast ?? def.breakfast,
    midMorning: input?.midMorning ?? def.midMorning,
    lunch: input?.lunch ?? def.lunch,
    afternoon: input?.afternoon ?? def.afternoon,
    dinner: input?.dinner ?? def.dinner,
  };
}

function normalizeDietProfile(
  input?: Partial<DietProfile> | null,
): DietProfile {
  return {
    goal: input?.goal ?? DEFAULT_DIET_PROFILE.goal,
    weightKg: input?.weightKg ?? DEFAULT_DIET_PROFILE.weightKg,
    heightCm: input?.heightCm ?? DEFAULT_DIET_PROFILE.heightCm,
    age: input?.age ?? DEFAULT_DIET_PROFILE.age,
    gender: input?.gender ?? DEFAULT_DIET_PROFILE.gender,
    activityLevel: input?.activityLevel ?? DEFAULT_DIET_PROFILE.activityLevel,
    recommendedCalories:
      input?.recommendedCalories ?? DEFAULT_DIET_PROFILE.recommendedCalories,
    proteinGrams: input?.proteinGrams ?? DEFAULT_DIET_PROFILE.proteinGrams,
    carbsGrams: input?.carbsGrams ?? DEFAULT_DIET_PROFILE.carbsGrams,
    fatsGrams: input?.fatsGrams ?? DEFAULT_DIET_PROFILE.fatsGrams,
    mealSchedule: normalizeMealSchedule(input?.mealSchedule),
    mealEnabled: normalizeMealEnabled(input?.mealEnabled),
    completedSteps: Number(
      input?.completedSteps ?? DEFAULT_DIET_PROFILE.completedSteps,
    ),
    setupCompleted: Boolean(
      input?.setupCompleted ?? DEFAULT_DIET_PROFILE.setupCompleted,
    ),
  };
}

export function isDietProfileComplete(
  profile: DietProfile | null | undefined,
): boolean {
  return Boolean(
    profile?.setupCompleted &&
    profile.goal !== null &&
    profile.weightKg !== null &&
    profile.heightCm !== null &&
    profile.age !== null &&
    profile.gender !== null &&
    profile.activityLevel !== null,
  );
}

async function canUseCloud(uid: string): Promise<boolean> {
  if (uid === "guest") {
    return false;
  }

  try {
    await auth.authStateReady();
    return auth.currentUser?.uid === uid;
  } catch (error) {
    console.error(
      "Error waiting auth before cloud diet profile access:",
      error,
    );
    return false;
  }
}

async function readLocalDietProfile(uid: string): Promise<DietProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(buildProfileStorageKey(uid));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<DietProfile>;
    return normalizeDietProfile(parsed);
  } catch (error) {
    console.error("Error reading local diet profile:", error);
    return null;
  }
}

async function writeLocalDietProfile(
  uid: string,
  profile: DietProfile,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      buildProfileStorageKey(uid),
      JSON.stringify(profile),
    );
  } catch (error) {
    console.error("Error writing local diet profile:", error);
  }
}

async function readCloudDietProfile(uid: string): Promise<DietProfile | null> {
  try {
    const profileRef = doc(
      db,
      USERS_COLLECTION,
      uid,
      DIET_SUBCOLLECTION,
      DIET_PROFILE_DOC_ID,
    );
    const snapshot = await getDoc(profileRef);

    if (!snapshot.exists()) {
      return null;
    }

    return normalizeDietProfile(snapshot.data() as Partial<DietProfile>);
  } catch (error) {
    console.error("Error reading cloud diet profile:", error);
    return null;
  }
}

async function writeCloudDietProfile(
  uid: string,
  profile: DietProfile,
): Promise<void> {
  try {
    const profileRef = doc(
      db,
      USERS_COLLECTION,
      uid,
      DIET_SUBCOLLECTION,
      DIET_PROFILE_DOC_ID,
    );
    await setDoc(
      profileRef,
      {
        ...profile,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error writing cloud diet profile:", error);
  }
}

export async function loadUserDietProfile(uid: string): Promise<DietProfile> {
  const localProfile = await readLocalDietProfile(uid);

  if (!(await canUseCloud(uid))) {
    const fallback = localProfile ?? normalizeDietProfile(DEFAULT_DIET_PROFILE);
    await writeLocalDietProfile(uid, fallback);
    return fallback;
  }

  const cloudProfile = await readCloudDietProfile(uid);
  if (cloudProfile) {
    await writeLocalDietProfile(uid, cloudProfile);
    return cloudProfile;
  }

  const fallback = localProfile ?? normalizeDietProfile(DEFAULT_DIET_PROFILE);
  await writeLocalDietProfile(uid, fallback);
  await writeCloudDietProfile(uid, fallback);
  return fallback;
}

export async function saveUserDietProfile(
  uid: string,
  profile: DietProfile,
): Promise<DietProfile> {
  const normalized = normalizeDietProfile(profile);

  await writeLocalDietProfile(uid, normalized);

  if (await canUseCloud(uid)) {
    await writeCloudDietProfile(uid, normalized);
  }

  return normalized;
}

export async function patchUserDietProfile(
  uid: string,
  partial: Partial<DietProfile>,
): Promise<DietProfile> {
  const current = await loadUserDietProfile(uid);
  const merged = normalizeDietProfile({ ...current, ...partial });

  // Compute calorie and macro estimates when we have enough info
  try {
    if (
      merged.weightKg !== null &&
      merged.heightCm !== null &&
      merged.age !== null &&
      merged.gender !== null &&
      merged.activityLevel !== null &&
      merged.goal !== null
    ) {
      const heightM = merged.heightCm / 100;
      const bmi = merged.weightKg / (heightM * heightM);

      const bmr =
        merged.gender === "MALE"
          ? 10 * merged.weightKg + 6.25 * merged.heightCm - 5 * merged.age + 5
          : 10 * merged.weightKg +
            6.25 * merged.heightCm -
            5 * merged.age -
            161;

      const activityMultiplier =
        merged.activityLevel === "LIGHT"
          ? 1.375
          : merged.activityLevel === "MODERATE"
            ? 1.55
            : merged.activityLevel === "ACTIVE"
              ? 1.725
              : merged.activityLevel === "EXTREME"
                ? 1.9
                : 1.2;

      const maintenanceCalories = Math.round(bmr * activityMultiplier);
      const deficit = bmi >= 30 ? 500 : bmi >= 25 ? 400 : 300;
      const recommendedCalories =
        merged.goal === "LOSE_WEIGHT"
          ? Math.round(Math.max(1200, maintenanceCalories - deficit))
          : maintenanceCalories;

      // Macros per user's specification
      let proteinRatio = merged.goal === "LOSE_WEIGHT" ? 0.3 : 0.35;
      const carbsRatio = 0.45;
      const fatsRatio = 0.25;

      const proteinGrams = Math.round((recommendedCalories * proteinRatio) / 4);
      const carbsGrams = Math.round((recommendedCalories * carbsRatio) / 4);
      const fatsGrams = Math.round((recommendedCalories * fatsRatio) / 9);

      merged.recommendedCalories = recommendedCalories;
      merged.proteinGrams = proteinGrams;
      merged.carbsGrams = carbsGrams;
      merged.fatsGrams = fatsGrams;
    }
  } catch (e) {
    // ignore computation errors and save profile anyway
    console.error("Error computing diet estimates:", e);
  }

  return saveUserDietProfile(uid, merged);
}

export async function getExistingUserDietProfile(
  uid: string,
): Promise<DietProfile | null> {
  if (uid === "guest") {
    return null;
  }

  const local = await readLocalDietProfile(uid);
  if (local !== null) {
    return local;
  }

  if (!(await canUseCloud(uid))) {
    return null;
  }

  const cloud = await readCloudDietProfile(uid);
  if (cloud !== null) {
    await writeLocalDietProfile(uid, cloud);
  }

  return cloud;
}

/**
 * Lightweight read-only check. Returns true only if the profile exists and
 * setupCompleted === true. Never writes anything to local storage or Firestore,
 * so it is safe to call on every screen focus without side effects or errors
 * from missing documents.
 */
export async function getDietSetupStatus(uid: string): Promise<boolean> {
  const profile = await getExistingUserDietProfile(uid);
  return isDietProfileComplete(profile);
}
