import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import RAW_FOOD_DATA from "./food-database.json";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type FoodCategory =
  | "verduras"
  | "frutas"
  | "cereales"
  | "grasas"
  | "leguminosas"
  | "lacteos"
  | "chucherias";

export type FoodPortion = {
  cantidad: number;
  unidad: string;
  gramos: number;
};

export type FoodItem = {
  /** ID del documento en Firestore (nombre con espacios → guiones bajos) */
  id: string;
  name: string;
  /** kcal por 100 g */
  kcal: number;
  /** Proteína (g) por 100 g */
  protein: number;
  /** Carbohidratos (g) por 100 g */
  carbs: number;
  /** Grasas (g) por 100 g */
  fats: number;
  /** Fibra (g) por 100 g */
  fiber: number;
  /** Porción de referencia; null = sin porción definida (se usa por 100 g) */
  portion: FoodPortion | null;
  category: FoodCategory;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const FOOD_DB_COLLECTION = "foodDatabase";
const FOOD_DB_META_DOC = "_meta";
const FOOD_DB_CACHE_KEY = "@food_database_v1";
/** TTL de la caché local: 24 horas */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CURRENT_DB_VERSION = 1;
/** Operaciones máximas por batch de Firestore */
const BATCH_SIZE = 400;

function isPermissionDeniedError(error: unknown): boolean {
  const maybe = error as { code?: string } | null;
  return maybe?.code === "permission-denied";
}

// ─── Base de datos local (fallback) ───────────────────────────────────────────

function toDocId(name: string): string {
  return name.replace(/ /g, "_");
}

export const FOOD_DATABASE_LOCAL: FoodItem[] = (
  RAW_FOOD_DATA as Omit<FoodItem, "id">[]
).map((item) => ({ ...item, id: toDocId(item.name) }));

// ─── Caché AsyncStorage ───────────────────────────────────────────────────────

type FoodCache = { items: FoodItem[]; cachedAt: number };

async function readCache(): Promise<FoodItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(FOOD_DB_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as FoodCache;
    if (Date.now() - cache.cachedAt > CACHE_TTL_MS) return null;
    return cache.items;
  } catch {
    return null;
  }
}

async function writeCache(items: FoodItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      FOOD_DB_CACHE_KEY,
      JSON.stringify({ items, cachedAt: Date.now() } satisfies FoodCache),
    );
  } catch (error) {
    console.error("[FoodDB] Error escribiendo caché local:", error);
  }
}

// ─── Firestore ────────────────────────────────────────────────────────────────

async function readFromFirestore(): Promise<FoodItem[] | null> {
  try {
    const snap = await getDocs(collection(db, FOOD_DB_COLLECTION));
    const items: FoodItem[] = [];

    snap.docs.forEach((d) => {
      if (d.id === FOOD_DB_META_DOC) return;
      const data = d.data();
      items.push({
        id: d.id,
        name: String(data.name),
        kcal: Number(data.kcal),
        protein: Number(data.protein),
        carbs: Number(data.carbs),
        fats: Number(data.fats),
        fiber: Number(data.fiber),
        portion: data.portion ?? null,
        category: data.category as FoodCategory,
      });
    });

    return items.length > 0 ? items : null;
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error("[FoodDB] Error leyendo desde Firestore:", error);
    }
    return null;
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

/**
 * Sube todos los alimentos a Firestore.
 * Si la versión ya fue cargada, no re-sube los datos.
 * Retorna `true` si tuvo éxito.
 */
export async function seedFoodDatabase(): Promise<boolean> {
  try {
    const metaRef = doc(db, FOOD_DB_COLLECTION, FOOD_DB_META_DOC);
    const metaSnap = await getDoc(metaRef);

    if (
      metaSnap.exists() &&
      Number(metaSnap.data().version) === CURRENT_DB_VERSION
    ) {
      console.log("[FoodDB] Base de datos ya inicializada (versión actual).");
      return true;
    }

    const items = FOOD_DATABASE_LOCAL;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      items.slice(i, i + BATCH_SIZE).forEach((item) => {
        const { id, ...data } = item;
        batch.set(doc(db, FOOD_DB_COLLECTION, id), data);
      });
      await batch.commit();
    }

    await setDoc(metaRef, {
      version: CURRENT_DB_VERSION,
      totalItems: items.length,
      seededAt: Date.now(),
    });

    console.log(`[FoodDB] ${items.length} alimentos subidos a Firestore.`);
    return true;
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error("[FoodDB] Error al subir base de datos:", error);
    }
    return false;
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Devuelve todos los alimentos.
 * Orden de prioridad: caché local → Firestore → datos embebidos en el bundle.
 */
export async function getFoodDatabase(): Promise<FoodItem[]> {
  const cached = await readCache();
  if (cached) return cached;

  const cloud = await readFromFirestore();
  if (cloud) {
    await writeCache(cloud);
    return cloud;
  }

  return FOOD_DATABASE_LOCAL;
}

/**
 * Invalida la caché local para forzar una re-lectura desde Firestore.
 */
export async function invalidateFoodCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FOOD_DB_CACHE_KEY);
  } catch {
    // noop
  }
}

/**
 * Busca alimentos por nombre (ignora tildes y mayúsculas).
 */
export function searchFoods(items: FoodItem[], query: string): FoodItem[] {
  if (!query.trim()) return items;
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const q = normalize(query);
  return items.filter((item) => normalize(item.name).includes(q));
}

/**
 * Filtra alimentos por categoría.
 */
export function getFoodsByCategory(
  items: FoodItem[],
  category: FoodCategory,
): FoodItem[] {
  return items.filter((item) => item.category === category);
}

/**
 * Obtiene un alimento por nombre exacto (sin distinguir mayúsculas).
 */
export function getFoodByName(
  items: FoodItem[],
  name: string,
): FoodItem | undefined {
  return items.find((item) => item.name.toLowerCase() === name.toLowerCase());
}

/**
 * Calcula las calorías y macros para una cantidad dada de gramos.
 */
export function calculateNutrition(
  item: FoodItem,
  grams: number,
): {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
} {
  const factor = grams / 100;
  return {
    kcal: Math.round(item.kcal * factor * 10) / 10,
    protein: Math.round(item.protein * factor * 10) / 10,
    carbs: Math.round(item.carbs * factor * 10) / 10,
    fats: Math.round(item.fats * factor * 10) / 10,
    fiber: Math.round(item.fiber * factor * 10) / 10,
  };
}
