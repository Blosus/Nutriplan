import { useTheme } from "@/hooks/theme-context";
import {
    ALL_WEEKDAYS,
    Alarm,
    cancelAlarmNotifications,
    getAlarmWeekdaysSummary,
    loadUserAlarms,
    saveUserAlarms,
    scheduleAlarmNotifications,
} from "@/services/alarms";
import { getCurrentSessionUser } from "@/services/session";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

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

export default function EditAlarma() {
  const { colors, theme } = useTheme();
  const styles = getDynamicStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams();
  const idParam = params.id as string | undefined;
  const scrollViewRef = useRef<ScrollView>(null);

  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean>(false);
  const [weekdays, setWeekdays] = useState<number[]>([...ALL_WEEKDAYS]);
  const [ownerUid, setOwnerUid] = useState("guest");
  const [isReady, setIsReady] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!idParam) {
        Alert.alert("Error", "No se especificó una alarma para editar.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      const sessionUser = await getCurrentSessionUser();
      const uid = sessionUser?.uid ?? "guest";
      setOwnerUid(uid);

      const list = await loadUserAlarms(uid);
      const found = list.find((a) => String(a.id) === String(idParam));
      if (found) {
        setAlarm(found);
        setName(found.name);
        setDescription(found.description);
        setEnabled(found.enabled);
        setWeekdays(
          found.weekdays?.length ? found.weekdays : [...ALL_WEEKDAYS],
        );
        const d = new Date();
        d.setHours(found.hour, found.minute, 0, 0);
        setDate(d);
      } else {
        Alert.alert("Alarma no encontrada", "La alarma solicitada no existe.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    };
    load();
  }, [idParam]);

  // Efecto para habilitar el scroll después de montar
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      scrollViewRef.current?.flashScrollIndicators();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const toggleWeekday = (weekday: number) => {
    setWeekdays((prev) => {
      if (prev.includes(weekday)) {
        if (prev.length === 1) return prev;
        return prev.filter((day) => day !== weekday);
      }
      return [...prev, weekday].sort((a, b) => a - b);
    });
  };

  // Efecto para manejar el teclado en iOS
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const formatTime = () => {
    if (!date) return "Seleccionar hora";
    const period = date.getHours() >= 12 ? "PM" : "AM";
    const displayHour = date.getHours() % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} ${period}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const saveAlarm = async () => {
    if (!alarm || !date) return;

    const hour = date.getHours();
    const minute = date.getMinutes();

    await cancelAlarmNotifications(alarm);

    let newNotifId: string | undefined;
    let newNotifIds: string[] | undefined;
    if (enabled) {
      const scheduled = await scheduleAlarmNotifications({
        id: alarm.id,
        hour,
        minute,
        name,
        description,
        weekdays,
      });
      newNotifId = scheduled.notifId;
      newNotifIds = scheduled.notifIds;
    }

    const list = await loadUserAlarms(ownerUid);
    const next = list.map((a) =>
      a.id === alarm.id
        ? {
            ...a,
            hour,
            minute,
            name,
            description,
            enabled,
            weekdays,
            notifId: newNotifId,
            notifIds: newNotifIds,
          }
        : a,
    );
    await saveUserAlarms(ownerUid, next);
    router.back();
  };

  const removeAlarm = async () => {
    if (!alarm) return;
    await cancelAlarmNotifications(alarm);
    const list = await loadUserAlarms(ownerUid);
    const next = list.filter((a) => a.id !== alarm.id);
    await saveUserAlarms(ownerUid, next);
    router.back();
  };

  if (!alarm) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? (keyboardVisible ? 90 : 0) : 0
        }
        enabled={Platform.OS === "ios"}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Editar Alarma</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bounces={true}
            alwaysBounceVertical={true}
            decelerationRate="normal"
            style={{ flex: 1 }}
            scrollEnabled={isReady}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Hora de la Alarma</Text>
                  <Text style={styles.sectionDescription}>
                    Ajusta la hora de tu alarma
                  </Text>

                  <TouchableOpacity
                    style={styles.timeSelector}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowPicker(true);
                    }}
                  >
                    <View style={styles.timeIconContainer}>
                      <Ionicons
                        name="time-outline"
                        size={24}
                        color={theme === "dark" ? colors.accent : colors.text}
                      />
                    </View>
                    <View style={styles.timeInfo}>
                      <Text style={styles.timeLabel}>Hora seleccionada</Text>
                      <Text style={styles.timeValue}>
                        {date ? formatTime() : "No seleccionada"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#888888"
                    />
                  </TouchableOpacity>

                  <View style={styles.timeTip}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={theme === "dark" ? colors.accent : colors.text}
                    />
                    <Text style={styles.timeTipText}>
                      Hora actual: {getCurrentTime()}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Nombre de la Alarma</Text>
                  <Text style={styles.sectionDescription}>
                    Describe brevemente para qué es la alarma (opcional)
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="pricetag-outline"
                      size={20}
                      color={theme === "dark" ? colors.accent : colors.text}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Ej: Despertar, Medicamento, Reunión"
                      placeholderTextColor="#888888"
                      value={name}
                      onChangeText={setName}
                      style={styles.input}
                      maxLength={30}
                    />
                    {name.length > 0 && (
                      <Text style={styles.charCounter}>{name.length}/30</Text>
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.section,
                    Platform.OS === "ios" &&
                      keyboardVisible &&
                      styles.sectionWithKeyboard,
                  ]}
                >
                  <Text style={styles.sectionTitle}>Descripción</Text>
                  <Text style={styles.sectionDescription}>
                    Detalles adicionales (opcional)
                  </Text>
                  <View style={styles.textAreaContainer}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={theme === "dark" ? colors.accent : colors.text}
                      style={styles.textAreaIcon}
                    />
                    <TextInput
                      placeholder="Ej: Tomar medicamento con agua, reunión importante"
                      placeholderTextColor="#888888"
                      value={description}
                      onChangeText={setDescription}
                      style={styles.textArea}
                      multiline
                      numberOfLines={4}
                      maxLength={100}
                      textAlignVertical="top"
                      blurOnSubmit={false}
                    />
                    <Text style={styles.textAreaCounter}>
                      {description.length}/100
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Días de repetición</Text>
                  <Text style={styles.sectionDescription}>
                    {getAlarmWeekdaysSummary(weekdays)}
                  </Text>
                  <View style={styles.weekdaysRow}>
                    {[
                      { value: 2, label: "L" },
                      { value: 3, label: "M" },
                      { value: 4, label: "X" },
                      { value: 5, label: "J" },
                      { value: 6, label: "V" },
                      { value: 7, label: "S" },
                      { value: 1, label: "D" },
                    ].map((day) => {
                      const active = weekdays.includes(day.value);
                      return (
                        <TouchableOpacity
                          key={day.value}
                          style={[
                            styles.weekdayChip,
                            active && styles.weekdayChipActive,
                          ]}
                          onPress={() => toggleWeekday(day.value)}
                        >
                          <Text
                            style={[
                              styles.weekdayChipText,
                              active && styles.weekdayChipTextActive,
                            ]}
                          >
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.weekdaysHint}>
                    Puedes apagar días específicos cuando ayunes o no cenes.
                  </Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, !date && styles.saveButtonDisabled]}
              onPress={saveAlarm}
              disabled={!date}
            >
              <Text style={styles.saveButtonText}>Guardar Alarma</Text>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.background}
              />
            </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={showPicker}
            mode="time"
            onConfirm={(d) => {
              setDate(d);
              setShowPicker(false);
            }}
            onCancel={() => setShowPicker(false)}
            themeVariant="dark"
            isDarkModeEnabled={true}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getDynamicStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "ios" ? 0 : 50,
      paddingBottom: 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 15,
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingTop: Platform.OS === "ios" ? 10 : 0,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitleContainer: {
      alignItems: "center",
      flex: 1,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      fontFamily: displayFont,
    },
    stepIndicator: {
      backgroundColor: colors.surface,
      color: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 5,
      fontFamily: textFont,
    },
    headerPlaceholder: { width: 40 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 120,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.accent + "1A",
    },
    sectionWithKeyboard: {
      marginBottom: Platform.OS === "ios" ? 20 : 15,
    },
    sectionTitle: {
      color: colors.accent,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 8,
      fontFamily: displayFont,
    },
    sectionDescription: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 20,
      lineHeight: 20,
      fontFamily: textFont,
    },
    timeSelector: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: 15,
    },
    timeIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent + "1A",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    timeInfo: { flex: 1 },
    timeLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
      marginBottom: 4,
      fontFamily: textFont,
    },
    timeValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
      fontFamily: displayFont,
    },
    timeTip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.accent + "0D",
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    timeTipText: {
      color: colors.text,
      fontSize: 14,
      flex: 1,
      fontFamily: textFont,
    },
    inputContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      paddingVertical: 16,
      fontFamily: textFont,
    },
    charCounter: {
      color: colors.textSecondary,
      fontSize: 12,
      marginLeft: 10,
      fontFamily: textFont,
    },
    textAreaContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      position: "relative",
    },
    textAreaIcon: {
      position: "absolute",
      top: 16,
      left: 15,
      zIndex: 1,
    },
    textArea: {
      color: colors.text,
      fontSize: 16,
      paddingVertical: 16,
      paddingHorizontal: 45,
      minHeight: 120,
      maxHeight: 200,
      textAlignVertical: "top",
      fontFamily: textFont,
    },
    textAreaCounter: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: "right",
      paddingHorizontal: 15,
      paddingBottom: 10,
      fontFamily: textFont,
    },
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    settingLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
      fontFamily: textFont,
    },
    weekdaysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
      marginBottom: 8,
    },
    weekdayChip: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    weekdayChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    weekdayChipText: {
      color: colors.text,
      fontWeight: "700",
      fontFamily: textFont,
    },
    weekdayChipTextActive: {
      color: colors.background,
    },
    weekdaysHint: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: textFont,
    },
    buttonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: Platform.OS === "ios" ? 34 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 5,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: 50,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    saveButtonDisabled: {
      backgroundColor: colors.border,
    },
    saveButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: textFont,
    },
  });
}
