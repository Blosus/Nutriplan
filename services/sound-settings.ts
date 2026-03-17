import AsyncStorage from "@react-native-async-storage/async-storage";

export type SoundSettings = {
  soundUri?: string;
  soundName?: string;
  useDefaultSound: boolean;
};

const SOUND_SETTINGS_KEY = "@alarm_sound_settings";

export async function getSoundSettings(): Promise<SoundSettings> {
  try {
    const data = await AsyncStorage.getItem(SOUND_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading sound settings:", error);
  }

  return {
    useDefaultSound: true,
  };
}

export async function saveSoundSettings(settings: SoundSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving sound settings:", error);
  }
}

export async function clearSoundSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SOUND_SETTINGS_KEY);
  } catch (error) {
    console.error("Error clearing sound settings:", error);
  }
}
