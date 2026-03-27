import { useTheme } from "@/hooks/theme-context";
import {
    ALL_WEEKDAYS,
    Alarm,
    getAlarmWeekdaysSummary,
    loadUserAlarms,
    saveUserAlarms,
    scheduleAlarmNotifications,
} from "@/services/alarms";
import { getCurrentSessionUser } from "@/services/session";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { getNewAlarmStyles } from "../styles/newAlarm.styles";

export default function NewAlarmScreen() {
  const { colors, theme } = useTheme();
  const styles = getNewAlarmStyles(colors);
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([...ALL_WEEKDAYS]);

  const toggleWeekday = (weekday: number) => {
    setWeekdays((prev) => {
      if (prev.includes(weekday)) {
        if (prev.length === 1) return prev;
        return prev.filter((day) => day !== weekday);
      }
      return [...prev, weekday].sort((a, b) => a - b);
    });
  };

  const saveAlarm = async () => {
    if (!date) return;

    const sessionUser = await getCurrentSessionUser();
    const ownerUid = sessionUser?.uid ?? "guest";

    const hour = date.getHours();
    const minute = date.getMinutes();

    const alarms = await loadUserAlarms(ownerUid);
    const alarmId = Date.now();
    const notifData = await scheduleAlarmNotifications({
      id: alarmId,
      hour,
      minute,
      name,
      description,
      weekdays,
    });

    const newAlarm: Alarm = {
      id: alarmId,
      hour,
      minute,
      name,
      description,
      enabled: true,
      weekdays,
      notifId: notifData.notifId,
      notifIds: notifData.notifIds,
    };

    await saveUserAlarms(ownerUid, [...alarms, newAlarm]);

    router.back();
  };

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nueva Alarma</Text>
          <Text style={styles.stepIndicator}>Paso 1 de 2</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Selección de Hora */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hora de la Alarma</Text>
          <Text style={styles.sectionDescription}>
            Selecciona la hora exacta para tu nueva alarma
          </Text>

          <TouchableOpacity
            style={styles.timeSelector}
            onPress={() => setShowPicker(true)}
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

            <Ionicons name="chevron-forward" size={20} color="#888888" />
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

        {/* Nombre de la Alarma */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre de la Alarma</Text>
          <Text style={styles.sectionDescription}>
            Asigna un nombre descriptivo a tu alarma (opcional)
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

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.sectionDescription}>
            Agrega notas o recordatorios adicionales (opcional)
          </Text>

          <View style={styles.textAreaContainer}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={theme === "dark" ? colors.accent : colors.text}
              style={styles.textAreaIcon}
            />
            <TextInput
              placeholder="Ej: Tomar medicamento con agua, Reunión importante, Ejercicio matutino"
              placeholderTextColor="#888888"
              value={description}
              onChangeText={setDescription}
              style={styles.textArea}
              multiline
              numberOfLines={4}
              maxLength={100}
              textAlignVertical="top"
            />
            <Text style={styles.textAreaCounter}>{description.length}/100</Text>
          </View>
        </View>

        {/* Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons
                name="notifications-active"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.settingLabel}>Activada al guardar</Text>
            </View>
            <View style={styles.settingBadge}>
              <Text style={styles.settingBadgeText}>SIEMPRE</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="repeat" size={20} color={colors.accent} />
              <Text style={styles.settingLabel}>Días configurados</Text>
            </View>
            <View style={styles.settingBadge}>
              <Text style={styles.settingBadgeText}>
                {getAlarmWeekdaysSummary(weekdays)}
              </Text>
            </View>
          </View>

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
                  activeOpacity={0.8}
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
            Puedes dejar apagado un día si ayunas o no cenas.
          </Text>
        </View>
      </ScrollView>

      {/* Botón de Guardar */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, !date && styles.saveButtonDisabled]}
          onPress={saveAlarm}
          disabled={!date}
        >
          <Text style={styles.saveButtonText}>Guardar Alarma</Text>
          <Ionicons name="checkmark-circle" size={20} color="#121212" />
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
  );
}

// Styles moved to app/styles/newAlarm.styles.ts
