import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { FoodCategory, FoodItem } from "./food-database";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CustomFoodItem = FoodItem & {
  isCustom: true;
  createdAt: number;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const USERS_COLLECTION = "users";
const CUSTOM_FOODS_SUBCOLLECTION = "customFoods";
const CACHE_KEY_PREFIX = "@custom_foods_v1";

function isPermissionDeniedError(error: unknown): boolean {
  const maybe = error as { code?: string } | null;
  return maybe?.code === "permission-denied";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCacheKey(uid: string) {
  return `${CACHE_KEY_PREFIX}:${uid}`;
}

async function canUseCloud(uid: string): Promise<boolean> {
  if (uid === "guest") return false;
  try {
    await auth.authStateReady();
    return auth.currentUser?.uid === uid;
  } catch {
    return false;
  }
}

// ─── Caché AsyncStorage ───────────────────────────────────────────────────────

async function readLocalCache(uid: string): Promise<CustomFoodItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(buildCacheKey(uid));
    return raw ? (JSON.parse(raw) as CustomFoodItem[]) : null;
  } catch {
    return null;
  }
}

async function writeLocalCache(
  uid: string,
  items: CustomFoodItem[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(buildCacheKey(uid), JSON.stringify(items));
  } catch (error) {
    console.error("[CustomFoods] Error writing local cache:", error);
  }
}

// ─── Firestore ────────────────────────────────────────────────────────────────

async function readFromFirestore(uid: string): Promise<CustomFoodItem[]> {
  try {
    const snap = await getDocs(
      collection(db, USERS_COLLECTION, uid, CUSTOM_FOODS_SUBCOLLECTION),
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name),
        kcal: Number(data.kcal),
        protein: Number(data.protein),
        carbs: Number(data.carbs),
        fats: Number(data.fats),
        fiber: Number(data.fiber ?? 0),
        portion: data.portion ?? null,
        category: data.category as FoodCategory,
        isCustom: true,
        createdAt: Number(data.createdAt ?? Date.now()),
      } satisfies CustomFoodItem;
    });
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error("[CustomFoods] Error reading from Firestore:", error);
    }
    return [];
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Devuelve los alimentos personalizados del usuario.
 * Prioridad: caché local → Firestore.
 * Usuarios "guest" solo usan almacenamiento local.
 */
export async function getUserCustomFoods(
  uid: string,
): Promise<CustomFoodItem[]> {
  if (uid === "guest") {
    return (await readLocalCache(uid)) ?? [];
  }

  const cached = await readLocalCache(uid);
  if (cached) return cached;

  const cloud = await readFromFirestore(uid);
  await writeLocalCache(uid, cloud);
  return cloud;
}

/**
 * Agrega un alimento personalizado. Se guarda en Firestore (si están
 * autenticados) y en la caché local.
 */
export async function addCustomFood(
  uid: string,
  food: Omit<CustomFoodItem, "id" | "isCustom" | "createdAt">,
): Promise<CustomFoodItem> {
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: CustomFoodItem = {
    ...food,
    id,
    isCustom: true,
    createdAt: Date.now(),
  };

  if (await canUseCloud(uid)) {
    const ref = doc(db, USERS_COLLECTION, uid, CUSTOM_FOODS_SUBCOLLECTION, id);
    try {
      await setDoc(ref, { ...item });
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        throw error;
      }
    }
  }

  const existing = (await readLocalCache(uid)) ?? [];
  await writeLocalCache(uid, [...existing, item]);
  return item;
}

/**
 * Elimina un alimento personalizado de Firestore y la caché local.
 */
export async function deleteCustomFood(uid: string, id: string): Promise<void> {
  if (await canUseCloud(uid)) {
    try {
      await deleteDoc(
        doc(db, USERS_COLLECTION, uid, CUSTOM_FOODS_SUBCOLLECTION, id),
      );
    } catch (error) {
      if (!isPermissionDeniedError(error)) {
        throw error;
      }
    }
  }

  const existing = (await readLocalCache(uid)) ?? [];
  await writeLocalCache(
    uid,
    existing.filter((f) => f.id !== id),
  );
}

/**
 * Invalida la caché local de alimentos personalizados.
 */
export async function invalidateCustomFoodsCache(uid: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(buildCacheKey(uid));
  } catch {
    // noop
  }
}
