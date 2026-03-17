import { useEffect, useState } from "react";
import AudioManager from "@/services/audio";
import { getSoundSettings } from "@/services/sound-settings";

export function useAlarmSound() {
  const [soundUri, setSoundUri] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSoundSettings();
        if (settings.soundUri) {
          setSoundUri(settings.soundUri);
        }
      } catch (error) {
        console.error("Error loading sound settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const playAlarmSound = async (soundEnabled: boolean) => {
    await AudioManager.startAlarmSound(soundEnabled, soundUri);
  };

  const stopAlarmSound = async () => {
    await AudioManager.stopAlarmSound();
  };

  return {
    soundUri,
    isLoading,
    playAlarmSound,
    stopAlarmSound,
  };
}

export default useAlarmSound;
