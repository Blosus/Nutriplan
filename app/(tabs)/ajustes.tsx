import SoundPicker from "@/components/sound-picker";
import VibrationPicker from "@/components/vibration-picker";
import { useTheme } from "@/hooks/theme-context";
import { signOutNutriApp } from "@/services/auth";
import {
  clearCurrentSessionUser,
  getCurrentSessionUser,
} from "@/services/session";
import {
  DEFAULT_USER_SETTINGS,
  ensureUserSettingsInitialized,
  saveUserSettings,
  VibrationType,
} from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const displayFont = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif-condensed",
  default: "System",
});

const textFont = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif",
  default: "System",
});

export default function AjustesScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    DEFAULT_USER_SETTINGS.notificationsEnabled,
  );
  const [soundEnabled, setSoundEnabled] = useState(
    DEFAULT_USER_SETTINGS.soundEnabled,
  );
  const [vibracionEnabled, setVibracionEnabled] = useState(
    DEFAULT_USER_SETTINGS.vibracionEnabled,
  );
  const [vibrationPattern, setVibrationPattern] = useState<VibrationType>(
    DEFAULT_USER_SETTINGS.vibrationPattern,
  );
  const [soundName, setSoundName] = useState(DEFAULT_USER_SETTINGS.soundName);
  const [soundUri, setSoundUri] = useState<string | null>(
    DEFAULT_USER_SETTINGS.soundUri,
  );
  const [settingsOwnerId, setSettingsOwnerId] = useState("guest");
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Modal states
  const [vibrationPickerVisible, setVibrationPickerVisible] = useState(false);
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentUser = await getCurrentSessionUser();
        const ownerUid = currentUser?.uid ?? "guest";
        setSettingsOwnerId(ownerUid);

        const settings = await ensureUserSettingsInitialized(ownerUid);
        setNotificationsEnabled(settings.notificationsEnabled);
        setSoundEnabled(settings.soundEnabled);
        setVibracionEnabled(settings.vibracionEnabled);
        setVibrationPattern(settings.vibrationPattern);
        setSoundName(settings.soundName);
        setSoundUri(settings.soundUri);
      } catch (error) {
        console.error("Error loading user settings:", error);
      } finally {
        setIsSettingsLoaded(true);
      }
    };

    void loadSettings();
  }, []);

  useEffect(() => {
    if (!isSettingsLoaded) {
      return;
    }

    const saveSettings = async () => {
      try {
        await saveUserSettings(settingsOwnerId, {
          notificationsEnabled,
          soundEnabled,
          vibracionEnabled,
          vibrationPattern,
          soundName,
          soundUri,
          theme,
        });
      } catch (error) {
        console.error("Error saving user settings:", error);
      }
    };

    void saveSettings();
  }, [
    notificationsEnabled,
    soundEnabled,
    vibracionEnabled,
    vibrationPattern,
    soundName,
    soundUri,
    isSettingsLoaded,
    settingsOwnerId,
  ]);

  const handleThemeToggle = async (value: boolean) => {
    if (value !== (theme === "dark")) {
      await toggleTheme();
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesion", "Seguro que deseas cerrar sesion?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesion",
        style: "destructive",
        onPress: async () => {
          await signOutNutriApp();
          await clearCurrentSessionUser();
          router.replace("/Login");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.stepIndicator,
              { backgroundColor: colors.surface, color: colors.accent },
            ]}
          >
            Configuración
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Notificaciones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            Notificaciones
          </Text>

          <View
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.accent}
              />
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Notificaciones
                </Text>
                <Text
                  style={[styles.settingHint, { color: colors.textSecondary }]}
                >
                  {notificationsEnabled ? "Habilitadas" : "Deshabilitadas"}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.accent + "50" }}
              thumbColor={
                notificationsEnabled ? colors.accent : colors.textSecondary
              }
            />
          </View>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: colors.surface },
              !notificationsEnabled && styles.disabledItem,
            ]}
            onPress={() => setSoundPickerVisible(true)}
            disabled={!notificationsEnabled}
            activeOpacity={notificationsEnabled ? 0.7 : 1}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="volume-high-outline"
                size={20}
                color={colors.accent}
              />
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Sonido
                </Text>
                <Text
                  style={[styles.settingHint, { color: colors.textSecondary }]}
                >
                  {soundEnabled ? `Actual: ${soundName}` : "Deshabilitado"}
                </Text>
              </View>
            </View>
            <View style={styles.settingControl}>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{
                  false: colors.border,
                  true: colors.accent + "50",
                }}
                thumbColor={soundEnabled ? colors.accent : colors.textSecondary}
                disabled={!notificationsEnabled}
              />
              {soundEnabled && notificationsEnabled && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.accent}
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              styles.settingItemLast,
              { backgroundColor: colors.surface },
              !notificationsEnabled && styles.disabledItem,
            ]}
            onPress={() => setVibrationPickerVisible(true)}
            disabled={!notificationsEnabled}
            activeOpacity={notificationsEnabled ? 0.7 : 1}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={colors.accent}
              />
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Vibración
                </Text>
                <Text
                  style={[styles.settingHint, { color: colors.textSecondary }]}
                >
                  {vibracionEnabled
                    ? `Patrón: ${vibrationPattern}`
                    : "Deshabilitado"}
                </Text>
              </View>
            </View>
            <View style={styles.settingControl}>
              <Switch
                value={vibracionEnabled}
                onValueChange={setVibracionEnabled}
                trackColor={{
                  false: colors.border,
                  true: colors.accent + "50",
                }}
                thumbColor={
                  vibracionEnabled ? colors.accent : colors.textSecondary
                }
                disabled={!notificationsEnabled}
              />
              {vibracionEnabled && notificationsEnabled && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.accent}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Apariencia */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            Apariencia
          </Text>

          <View
            style={[
              styles.settingItem,
              styles.settingItemLast,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name={theme === "dark" ? "moon" : "sunny"}
                size={20}
                color={colors.accent}
              />
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {theme === "dark" ? "Modo Oscuro" : "Modo Claro"}
              </Text>
            </View>
            <Switch
              value={theme === "dark"}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.border, true: colors.accent + "50" }}
              thumbColor={
                theme === "dark" ? colors.accent : colors.textSecondary
              }
            />
          </View>
        </View>

        {/* Información */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            Información
          </Text>

          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              Versión
            </Text>
            <Text style={[styles.infoValue, { color: colors.accent }]}>
              1.0.0
            </Text>
          </View>

          <View
            style={[
              styles.infoItem,
              styles.settingItemLast,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              Desarrollado por
            </Text>
            <Text style={[styles.infoValue, { color: colors.accent }]}>
              NutriFit Team
            </Text>
          </View>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            Cuenta
          </Text>

          <TouchableOpacity
            style={styles.dangerButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF5252" />
            <Text style={styles.dangerButtonText}>Cerrar sesion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modales */}
      <VibrationPicker
        visible={vibrationPickerVisible}
        currentPattern={vibrationPattern}
        onSelect={setVibrationPattern}
        onClose={() => setVibrationPickerVisible(false)}
      />

      <SoundPicker
        visible={soundPickerVisible}
        currentSound={soundName}
        uid={settingsOwnerId}
        onSelect={(name, uri) => {
          setSoundName(name);
          setSoundUri(uri ?? null);
        }}
        onClose={() => setSoundPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitleContainer: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    color: "#FFF8E1",
    fontSize: 24,
    fontWeight: "700",
  },
  stepIndicator: {
    backgroundColor: "#1E1E1E",
    color: "#FFD54F",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
    fontFamily: textFont,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: "#FFD54F",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    fontFamily: displayFont,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    marginBottom: 8,
  },
  settingItemLast: {
    marginBottom: 0,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabledItem: {
    opacity: 0.6,
  },
  settingLabelContainer: {
    flexDirection: "column",
    gap: 4,
  },
  settingLabel: {
    color: "#FFF8E1",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: textFont,
  },
  settingHint: {
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "400",
    fontFamily: textFont,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    color: "#FFF8E1",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: textFont,
  },
  infoValue: {
    color: "#FFD54F",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: textFont,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 82, 82, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF5252",
  },
  dangerButtonText: {
    color: "#FF5252",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: textFont,
  },
});
