import { useTheme } from "@/hooks/theme-context";
import {
    Alarm,
    cancelAlarmNotifications,
    loadUserAlarms,
    saveUserAlarms,
} from "@/services/alarms";
import AudioManager from "@/services/audio";
import { getCurrentSessionUser } from "@/services/session";
import { ensureUserSettingsInitialized } from "@/services/user-settings";
import VibrationManager, { VibrationType } from "@/services/vibration";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

// Importamos los estilos separados
import { getAlarmScreenStyles } from "../styles/alarmScreen.styles";

export default function AlarmScreen() {
  const { colors } = useTheme();
  const styles = getAlarmScreenStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const idParam = params.id as string | undefined;

  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [ownerUid, setOwnerUid] = useState("guest");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibracionEnabled, setVibracionEnabled] = useState(false);
  const [vibrationPattern, setVibrationPattern] =
    useState<VibrationType>("NORMAL");
  const [soundName, setSoundName] = useState("sonidolol.mp3");
  const [soundUri, setSoundUri] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!idParam) return;

      try {
        const sessionUser = await getCurrentSessionUser();
        const uid = sessionUser?.uid ?? "guest";
        setOwnerUid(uid);

        // Cargar la alarma
        const list = await loadUserAlarms(uid);
        const found = list.find((a) => String(a.id) === String(idParam));
        if (found) setAlarm(found);

        // Cargar configuraciones de sonido y vibración
        const settings = await ensureUserSettingsInitialized(uid);
        setSoundEnabled(settings.soundEnabled);
        setVibracionEnabled(settings.vibracionEnabled);
        setVibrationPattern(settings.vibrationPattern);
        setSoundName(settings.soundName);
        setSoundUri(settings.soundUri);
      } catch (error) {
        console.error("Error loading alarm and settings:", error);
      }
    };

    load();
  }, [idParam]);

  useEffect(() => {
    const startAlarm = async () => {
      // Iniciar vibración si está habilitada
      if (vibracionEnabled) {
        VibrationManager.startVibration(vibrationPattern);
      }

      // Iniciar sonido si está habilitado
      if (soundEnabled) {
        await AudioManager.startAlarmSound(soundEnabled, soundUri ?? undefined);
      }
    };

    const cleanup = async () => {
      VibrationManager.stopVibration();
      await AudioManager.stopAlarmSound();
    };

    startAlarm();

    return () => {
      cleanup();
    };
  }, [soundEnabled, vibracionEnabled, vibrationPattern, soundUri]);

  const stopSound = async () => {
    try {
      VibrationManager.stopVibration();
      await AudioManager.stopAlarmSound();
    } catch (e) {
      console.error("Error stopping alarm:", e);
    }
  };

  const dismiss = async () => {
    try {
      VibrationManager.stopVibration();
      await AudioManager.stopAlarmSound();
    } catch (e) {
      console.error("Error during dismiss:", e);
    }
    router.back();
  };

  const stopAndDisable = async () => {
    if (!alarm) return;
    await cancelAlarmNotifications(alarm);
    // actualizar almacenamiento
    const list = await loadUserAlarms(ownerUid);
    const next = list.map((a) =>
      a.id === alarm.id
        ? { ...a, enabled: false, notifId: undefined, notifIds: undefined }
        : a,
    );
    await saveUserAlarms(ownerUid, next);

    dismiss();
  };

  if (!alarm) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{alarm.name || "Alarma"}</Text>
        <Text style={styles.time}>
          {String(alarm.hour).padStart(2, "0")}:
          {String(alarm.minute).padStart(2, "0")}
        </Text>
        <Text style={styles.desc}>{alarm.description}</Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.surface }]}
            onPress={dismiss}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Detener
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#F44336" }]}
            onPress={() => {
              Alert.alert(
                "Desactivar alarma",
                "¿Deseas desactivar esta alarma y cancelar futuras repeticiones?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Desactivar",
                    style: "destructive",
                    onPress: stopAndDisable,
                  },
                ],
              );
            }}
          >
            <Text style={[styles.buttonText, { color: "#FFF" }]}>
              Detener y Desactivar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
