import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { storage, auth } from "./firebase";

export type CustomSound = {
  name: string;       // nombre de display (e.g., "Mi Alarma.mp3")
  fileName: string;   // nombre del archivo en Storage (e.g., "abc123.mp3")
  downloadUrl: string;
  uploadedAt: number; // timestamp
};

const LOCAL_SOUNDS_KEY_PREFIX = "@user_sounds";
const buildLocalKey = (uid: string) => `${LOCAL_SOUNDS_KEY_PREFIX}:${uid}`;
const buildStoragePath = (uid: string, fileName: string) =>
  `user_sounds/${uid}/${fileName}`;

async function canUseCloud(uid: string): Promise<boolean> {
  if (uid === "guest") return false;
  try {
    await auth.authStateReady();
    return auth.currentUser?.uid === uid;
  } catch {
    return false;
  }
}

export async function readLocalSounds(uid: string): Promise<CustomSound[]> {
  try {
    const raw = await AsyncStorage.getItem(buildLocalKey(uid));
    return raw ? (JSON.parse(raw) as CustomSound[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalSounds(uid: string, sounds: CustomSound[]): Promise<void> {
  try {
    await AsyncStorage.setItem(buildLocalKey(uid), JSON.stringify(sounds));
  } catch (error) {
    console.error("Error writing local sounds:", error);
  }
}

/**
 * Sube un archivo de audio a Firebase Storage y lo registra localmente.
 * @param uid - UID del usuario
 * @param localUri - URI local del archivo (desde DocumentPicker)
 * @param displayName - Nombre de display del sonido
 */
export async function uploadCustomSound(
  uid: string,
  localUri: string,
  displayName: string
): Promise<CustomSound> {
  // Leer el contenido como blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  const ext = displayName.split(".").pop() ?? "mp3";
  const fileName = `${Date.now()}_${displayName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const newSound: CustomSound = {
    name: displayName,
    fileName,
    downloadUrl: localUri, // temporal: URI local mientras sube
    uploadedAt: Date.now(),
  };

  if (await canUseCloud(uid)) {
    // Subir a Firebase Storage
    const storageRef = ref(storage, buildStoragePath(uid, fileName));
    await uploadBytes(storageRef, blob, { contentType: `audio/${ext}` });
    const downloadUrl = await getDownloadURL(storageRef);
    newSound.downloadUrl = downloadUrl;
  }

  // Guardar en lista local
  const existing = await readLocalSounds(uid);
  const updated = [...existing, newSound];
  await writeLocalSounds(uid, updated);

  return newSound;
}

/**
 * Elimina un sonido personalizado del usuario.
 */
export async function deleteCustomSound(uid: string, fileName: string): Promise<void> {
  // Eliminar de Firebase Storage si es posible
  if (await canUseCloud(uid)) {
    try {
      const storageRef = ref(storage, buildStoragePath(uid, fileName));
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting from storage:", error);
    }
  }

  // Eliminar de lista local
  const existing = await readLocalSounds(uid);
  const updated = existing.filter((s) => s.fileName !== fileName);
  await writeLocalSounds(uid, updated);
}

/**
 * Sincroniza los sonidos del usuario desde Firebase Storage hacia local.
 * Útil al hacer login en un dispositivo nuevo.
 */
export async function syncSoundsFromCloud(uid: string): Promise<CustomSound[]> {
  if (!(await canUseCloud(uid))) {
    return readLocalSounds(uid);
  }

  try {
    const folderRef = ref(storage, `user_sounds/${uid}`);
    const list = await listAll(folderRef);

    const localSounds = await readLocalSounds(uid);
    const localMap = new Map(localSounds.map((s) => [s.fileName, s]));

    // Para cada archivo en Storage, obtener URL de descarga si no está en local
    const synced: CustomSound[] = [];
    for (const itemRef of list.items) {
      const fileName = itemRef.name;
      const existing = localMap.get(fileName);
      if (existing) {
        synced.push(existing);
      } else {
        try {
          const downloadUrl = await getDownloadURL(itemRef);
          const newSound: CustomSound = {
            name: fileName,
            fileName,
            downloadUrl,
            uploadedAt: 0,
          };
          synced.push(newSound);
        } catch {
          // ignorar archivos que no se puedan leer
        }
      }
    }

    await writeLocalSounds(uid, synced);
    return synced;
  } catch (error) {
    console.error("Error syncing sounds from cloud:", error);
    return readLocalSounds(uid);
  }
}
