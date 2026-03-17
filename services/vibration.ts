import { useTheme } from "@/hooks/theme-context";
import { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const displayFont = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-condensed',
  default: 'System',
});

const textFont = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  default: 'System',
});

// Patrones de vibración diferentes
export const VIBRATION_PATTERNS = {
  GENTLE: [100, 100],           // Suave: 100ms vibración, 100ms pausa
  NORMAL: [200, 150],           // Normal: 200ms vibración, 150ms pausa
  STRONG: [300, 200],           // Fuerte: 300ms vibración, 200ms pausa
  PULSE: [100, 50, 100, 50],    // Pulso: 3 pulsos cortos
  WAVE: [50, 100, 150, 100],    // Onda: patrón ascendente
};

export type VibrationType = keyof typeof VIBRATION_PATTERNS;

export class VibrationManager {
  private static vibrationInterval: NodeJS.Timeout | null = null;
  private static isVibrating = false;

  static startVibration(pattern: VibrationType = 'NORMAL') {
    if (this.isVibrating) {
      return;
    }

    if (!Platform.OS || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      console.warn('Vibration not supported on this platform');
      return;
    }

    this.isVibrating = true;
    const vibrationPattern = VIBRATION_PATTERNS[pattern];

    // Iniciar vibración
    Vibration.vibrate(vibrationPattern, true);
  }

  static stopVibration() {
    try {
      Vibration.cancel();
      this.isVibrating = false;
      if (this.vibrationInterval) {
        clearTimeout(this.vibrationInterval);
        this.vibrationInterval = null;
      }
    } catch (error) {
      console.error('Error stopping vibration:', error);
    }
  }

  static isVibrating_() {
    return this.isVibrating;
  }
}

export default VibrationManager;
