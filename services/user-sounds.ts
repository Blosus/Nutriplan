import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

export type CustomSound = {
  name: string;       // nombre de display (e.g., "Mi Alarma.mp3")
  fileName: string;   // nombre del archivo guardado localmente
  downloadUrl: string; // URI local del archivo
  uploadedAt: number; // timestamp
};

const LOCAL_SOUNDS_KEY_PREFIX = "@user_sounds";
const buildLocalKey = (uid: string) => `${LOCAL_SOUNDS_KEY_PREFIX}:${uid}`;

// Directorio permanente donde se guardan los audios por usuario
function getSoundsDir(uid: string): Directory {
  return new Directory(Paths.document, "user_sounds", uid);
}

function ensureSoundsDir(uid: string): void {
  const dir = getSoundsDir(uid);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
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
 * Guarda un sonido personalizado localmente (URI del dispositivo).
 * @param uid - UID del usuario
 * @param localUri - URI local del archivo (desde DocumentPicker)
 * @param displayName - Nombre de display del sonido
 */
export async function uploadCustomSound(
  uid: string,
  localUri: string,
  displayName: string
): Promise<CustomSound> {
  const fileName = `${Date.now()}_${displayName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Copiar al directorio permanente para que no lo borre el SO
  ensureSoundsDir(uid);
  const destFile = new File(getSoundsDir(uid), fileName);
  new File(localUri).copy(destFile);

  const newSound: CustomSound = {
    name: displayName,
    fileName,
    downloadUrl: destFile.uri,
    uploadedAt: Date.now(),
  };

  const existing = await readLocalSounds(uid);
  const updated = [...existing, newSound];
  await writeLocalSounds(uid, updated);

  return newSound;
}

/**
 * Elimina un sonido personalizado local.
 */
export async function deleteCustomSound(uid: string, fileName: string): Promise<void> {
  // Eliminar el archivo físico permanente si existe
  try {
    const fileToDelete = new File(getSoundsDir(uid), fileName);
    if (fileToDelete.exists) {
      fileToDelete.delete();
    }
  } catch {
    // Si no se puede borrar el archivo, continuar de todas formas
  }

  const existing = await readLocalSounds(uid);
  const updated = existing.filter((s) => s.fileName !== fileName);
  await writeLocalSounds(uid, updated);
}

/**
 * Compatibilidad: retorna los sonidos locales del usuario.
 */
export async function syncSoundsFromCloud(uid: string): Promise<CustomSound[]> {
  return readLocalSounds(uid);
}
