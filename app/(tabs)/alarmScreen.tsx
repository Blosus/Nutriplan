import { useTheme } from '@/hooks/theme-context';
import { Alarm, loadUserAlarms, saveUserAlarms } from '@/services/alarms';
import { getCurrentSessionUser } from '@/services/session';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, Vibration, View } from 'react-native';

// Importamos los estilos separados
import { getAlarmScreenStyles } from '../styles/alarmScreen.styles';

export default function AlarmScreen() {
  const { colors } = useTheme();
  const styles = getAlarmScreenStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const idParam = params.id as string | undefined;

  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [ownerUid, setOwnerUid] = useState('guest');
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!idParam) return;
      const sessionUser = await getCurrentSessionUser();
      const uid = sessionUser?.uid ?? 'guest';
      setOwnerUid(uid);

      const list = await loadUserAlarms(uid);
      const found = list.find(a => String(a.id) === String(idParam));
      if (found) setAlarm(found);
    };

    load();
  }, [idParam]);

  useEffect(() => {
    let vibrateOn = true;

    const startVibration = () => {
      // patrón: pausa, vibrar, pausa corta, vibrar
      Vibration.vibrate([0, 700, 200, 700], true);
    };

    const stopVibration = () => {
      Vibration.cancel();
      vibrateOn = false;
    };

    const startSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          // Usa un sonido por defecto embebido en la app si existe, sino reproducir silencio
          require('../../assets/alarm_sound.mp3'),
          { isLooping: true, volume: 1.0 }
        );
        soundRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        // no hay asset, intentar reproducir el sonido por notificación solo
        console.log('Error playing sound:', e);
      }
    };

    startVibration();
    startSound();

    return () => {
      stopVibration();
      stopSound();
    };
  }, []);

  const stopSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
  };

  const dismiss = async () => {
    // solo detener sonido/vibración y volver
    try { Vibration.cancel(); } catch (e) {}
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
    router.back();
  };

  const stopAndDisable = async () => {
    if (!alarm) return;
    // cancelar notificación programada
    if (alarm.notifId) {
      try { await Notifications.cancelScheduledNotificationAsync(alarm.notifId); } catch (e) {}
    }
    // actualizar almacenamiento
    const list = await loadUserAlarms(ownerUid);
    const next = list.map(a => a.id === alarm.id ? { ...a, enabled: false, notifId: undefined } : a);
    await saveUserAlarms(ownerUid, next);

    dismiss();
  };

  if (!alarm) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{alarm.name || 'Alarma'}</Text>
        <Text style={styles.time}>
          {String(alarm.hour).padStart(2, '0')}:{String(alarm.minute).padStart(2, '0')}
        </Text>
        <Text style={styles.desc}>{alarm.description}</Text>

        <View style={styles.buttons}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.surface }]} 
            onPress={dismiss}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Detener</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#F44336' }]} 
            onPress={() => {
              Alert.alert(
                'Desactivar alarma', 
                '¿Deseas desactivar esta alarma y cancelar futuras repeticiones?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Desactivar', style: 'destructive', onPress: stopAndDisable }
                ]
              );
            }}
          >
            <Text style={[styles.buttonText, { color: '#FFF' }]}>Detener y Desactivar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}