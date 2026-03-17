import { useTheme } from "@/hooks/theme-context";
import { Alarm, loadUserAlarms, saveUserAlarms } from "@/services/alarms";
import { getCurrentSessionUser } from "@/services/session";
import {
  DietGender,
  DietGoal,
  DietMealSchedule,
  MealTime,
  isDietProfileComplete,
  loadUserDietProfile,
  patchUserDietProfile,
} from "@/services/user-diet-profile";
import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { getDietSetupStyles } from "./styles/diet-setup.styles";

type SetupStep = 1 | 2 | 3;
type MealKey = "breakfast" | "midMorning" | "lunch" | "afternoon" | "dinner";

const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: "Desayuno",
  midMorning: "Media Mañana",
  lunch: "Almuerzo",
  afternoon: "Media Tarde",
  dinner: "Cena",
};

const MEAL_ORDER: MealKey[] = ["breakfast", "midMorning", "lunch", "afternoon", "dinner"];

const DEFAULT_MEAL_TIMES: DietMealSchedule = {
  breakfast: { hour: 8, minute: 0 },
  midMorning: { hour: 11, minute: 0 },
  lunch: { hour: 13, minute: 0 },
  afternoon: { hour: 17, minute: 0 },
  dinner: { hour: 20, minute: 0 },
};

function formatMealTime(mt: MealTime): string {
  const period = mt.hour >= 12 ? "p. m." : "a. m.";
  const h = mt.hour % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(mt.minute).padStart(2, "0")} ${period}`;
}

function mealTimeToDate(mt: MealTime): Date {
  const d = new Date();
  d.setHours(mt.hour, mt.minute, 0, 0);
  return d;
}

export default function DietSetupScreen() {
  const { colors } = useTheme();
  const styles = getDietSetupStyles(colors);
  const [currentStep, setCurrentStep] = useState<SetupStep>(1);
  const [uid, setUid] = useState("guest");
  const [goal, setGoal] = useState<DietGoal | null>(null);
  const [weightText, setWeightText] = useState("");
  const [heightText, setHeightText] = useState("");
  const [ageText, setAgeText] = useState("");
  const [gender, setGender] = useState<DietGender | null>(null);
  const [mealTimes, setMealTimes] = useState<DietMealSchedule>(DEFAULT_MEAL_TIMES);
  const [activePicker, setActivePicker] = useState<MealKey | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const sessionUser = await getCurrentSessionUser();
      const ownerUid = sessionUser?.uid ?? "guest";
      setUid(ownerUid);

      const profile = await loadUserDietProfile(ownerUid);
      setGoal(profile.goal);
      setWeightText(profile.weightKg ? String(profile.weightKg) : "");
      setHeightText(profile.heightCm ? String(profile.heightCm) : "");
      setAgeText(profile.age ? String(profile.age) : "");
      setGender(profile.gender);
      if (profile.mealSchedule) {
        setMealTimes(profile.mealSchedule);
      }

      if (!profile.goal) {
        setCurrentStep(1);
      } else if (
        profile.weightKg == null ||
        profile.heightCm == null ||
        profile.age == null ||
        profile.gender == null
      ) {
        setCurrentStep(2);
      } else if (!isDietProfileComplete(profile)) {
        setCurrentStep(3);
      } else {
        setCurrentStep(3);
      }

      setIsHydrated(true);
    };

    void bootstrap();
  }, []);

  const stepTitle = useMemo(() => {
    if (currentStep === 1) return "Tu Objetivo";
    if (currentStep === 2) return "Tus Medidas";
    return "Horarios";
  }, [currentStep]);

  const goBack = () => {
    if (currentStep === 1) {
      router.back();
      return;
    }
    setCurrentStep((prev) => (prev - 1) as SetupStep);
  };

  const handleStep1Continue = async () => {
    if (!goal) {
      Alert.alert("Selecciona una opción", "Elige Bajar de peso o Mantenerme para continuar.");
      return;
    }

    setIsSaving(true);
    await patchUserDietProfile(uid, {
      goal,
      completedSteps: Math.max(1, currentStep),
    });
    setIsSaving(false);
    setCurrentStep(2);
  };

  const handleStep2Continue = async () => {
    const weight = Number(weightText.replace(",", "."));
    const height = Number(heightText.replace(",", "."));
    const age = Number(ageText.replace(",", "."));

    if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
      Alert.alert("Peso inválido", "Ingresa un peso válido entre 20 y 400 kg.");
      return;
    }

    if (!Number.isFinite(height) || height < 80 || height > 260) {
      Alert.alert("Altura inválida", "Ingresa una altura válida entre 80 y 260 cm.");
      return;
    }

    if (!Number.isFinite(age) || age < 10 || age > 120) {
      Alert.alert("Edad inválida", "Ingresa una edad válida entre 10 y 120 años.");
      return;
    }

    if (!gender) {
      Alert.alert("Selecciona tu género", "Elige hombre o mujer para continuar.");
      return;
    }

    setIsSaving(true);
    await patchUserDietProfile(uid, {
      weightKg: Number(weight.toFixed(1)),
      heightCm: Math.round(height),
      age: Math.round(age),
      gender,
      completedSteps: Math.max(2, currentStep),
    });
    setIsSaving(false);
    setCurrentStep(3);
  };

  const handleFinish = async () => {
    setIsSaving(true);

    await patchUserDietProfile(uid, {
      mealSchedule: mealTimes,
      completedSteps: 3,
      setupCompleted: true,
    });

    // Replace any existing meal alarms with the new schedule
    const existingAlarms = await loadUserAlarms(uid);
    const mealNames = Object.values(MEAL_LABELS);
    const alarmsToKeep: Alarm[] = [];
    for (const alarm of existingAlarms) {
      if (mealNames.includes(alarm.name)) {
        if (alarm.notifId) {
          try { await Notifications.cancelScheduledNotificationAsync(alarm.notifId); } catch (_) {}
        }
      } else {
        alarmsToKeep.push(alarm);
      }
    }

    const newMealAlarms: Alarm[] = [];
    for (let i = 0; i < MEAL_ORDER.length; i++) {
      const key = MEAL_ORDER[i];
      const { hour, minute } = mealTimes[key];
      const name = MEAL_LABELS[key];
      const alarmId = Date.now() + i;

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: name,
          body: "¡Es hora de tu comida!",
          sound: true,
          data: { alarmId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        } as any,
      });

      newMealAlarms.push({
        id: alarmId,
        hour,
        minute,
        name,
        description: "Alarma de comida",
        enabled: true,
        notifId,
      });
    }

    await saveUserAlarms(uid, [...alarmsToKeep, ...newMealAlarms]);
    setIsSaving(false);
    router.back();
  };

  if (!isHydrated) {
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{stepTitle}</Text>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{`Paso ${currentStep} de 3`}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {currentStep === 1 && (
            <>
              <Text style={styles.introText}>Selecciona lo que quieres lograr con tu plan nutricional:</Text>
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[styles.optionCard, goal === "LOSE_WEIGHT" && styles.optionCardActive]}
                  onPress={() => setGoal("LOSE_WEIGHT")}
                >
                  <View style={styles.optionIcon}>
                    <Feather name="arrow-down" size={28} color={colors.accent} />
                  </View>
                  <Text style={styles.optionTitle}>Bajar de peso</Text>
                  <Text style={styles.optionDescription}>Reducir grasa corporal y lograr un peso más saludable.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionCard, goal === "MAINTAIN_WEIGHT" && styles.optionCardActive]}
                  onPress={() => setGoal("MAINTAIN_WEIGHT")}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="balance-scale" size={24} color={colors.accent} />
                  </View>
                  <Text style={styles.optionTitle}>Mantenerme</Text>
                  <Text style={styles.optionDescription}>Conservar mi peso actual con hábitos saludables.</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Text style={styles.introText}>Ingresa tus datos para personalizar tu plan:</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Peso (kg)</Text>
                <View style={styles.fieldRow}>
                  <MaterialIcons name="monitor-weight" size={22} color={colors.accent} />
                  <TextInput
                    style={styles.input}
                    value={weightText}
                    onChangeText={setWeightText}
                    placeholder="Ej: 68.5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Altura (cm)</Text>
                <View style={styles.fieldRow}>
                  <MaterialIcons name="height" size={22} color={colors.accent} />
                  <TextInput
                    style={styles.input}
                    value={heightText}
                    onChangeText={setHeightText}
                    placeholder="Ej: 175"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Edad</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="calendar-outline" size={22} color={colors.accent} />
                  <TextInput
                    style={styles.input}
                    value={ageText}
                    onChangeText={setAgeText}
                    placeholder="Ej: 24"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.unitText}>años</Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Género</Text>
                <View style={styles.genderChoices}>
                  <TouchableOpacity
                    style={[styles.genderChoice, gender === "MALE" && styles.genderChoiceActive]}
                    onPress={() => setGender("MALE")}
                  >
                    <Ionicons name="male-outline" size={20} color={colors.accent} />
                    <Text style={styles.genderChoiceText}>Hombre</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.genderChoice, gender === "FEMALE" && styles.genderChoiceActive]}
                    onPress={() => setGender("FEMALE")}
                  >
                    <Ionicons name="female-outline" size={20} color={colors.accent} />
                    <Text style={styles.genderChoiceText}>Mujer</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={colors.accent} />
                <Text style={styles.infoText}>
                  Peso, altura, edad y género nos ayudan a estimar mejor tus necesidades calóricas diarias.
                </Text>
              </View>
            </>
          )}

          {currentStep === 3 && (
            <>
              <Text style={styles.introText}>
                Configura tus horarios de comidas para planificar mejor tu día:
              </Text>

              <View style={styles.mealList}>
                {MEAL_ORDER.map((mealKey) => (
                  <View key={mealKey} style={styles.mealItem}>
                    <View style={styles.mealIcon}>
                      {mealKey === "breakfast" && (
                        <Ionicons name="sunny" size={22} color={colors.accent} />
                      )}
                      {mealKey === "midMorning" && (
                        <FontAwesome5 name="coffee" size={19} color={colors.accent} />
                      )}
                      {mealKey === "lunch" && (
                        <MaterialIcons name="restaurant" size={22} color={colors.accent} />
                      )}
                      {mealKey === "afternoon" && (
                        <FontAwesome5 name="apple-alt" size={19} color={colors.accent} />
                      )}
                      {mealKey === "dinner" && (
                        <Ionicons name="moon" size={22} color={colors.accent} />
                      )}
                    </View>
                    <View style={styles.mealContent}>
                      <Text style={styles.mealTitle}>{MEAL_LABELS[mealKey]}</Text>
                      <TouchableOpacity
                        style={styles.mealTimeButton}
                        onPress={() => setActivePicker(mealKey)}
                      >
                        <Text style={styles.mealTimeText}>
                          {formatMealTime(mealTimes[mealKey])}
                        </Text>
                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="bulb-outline" size={20} color={colors.accent} />
                <Text style={styles.infoText}>
                  Estos horarios nos ayudarán a recordarte cuándo es tiempo de cada comida.
                </Text>
              </View>

              <DateTimePickerModal
                isVisible={activePicker !== null}
                mode="time"
                date={activePicker ? mealTimeToDate(mealTimes[activePicker]) : new Date()}
                onConfirm={(date) => {
                  if (activePicker) {
                    setMealTimes((prev) => ({
                      ...prev,
                      [activePicker]: { hour: date.getHours(), minute: date.getMinutes() },
                    }));
                  }
                  setActivePicker(null);
                }}
                onCancel={() => setActivePicker(null)}
                locale="es"
                is24Hour={false}
              />
            </>
          )}
        </ScrollView>

        {currentStep === 1 && (
          <TouchableOpacity
            style={[styles.bottomButton, (!goal || isSaving) && styles.bottomButtonDisabled]}
            onPress={handleStep1Continue}
            disabled={!goal || isSaving}
          >
            <Text style={styles.bottomButtonText}>Continuar</Text>
            <Feather name="arrow-right" size={18} color={colors.background} />
          </TouchableOpacity>
        )}

        {currentStep === 2 && (
          <TouchableOpacity
            style={[
              styles.bottomButton,
              (!weightText || !heightText || !ageText || !gender || isSaving) && styles.bottomButtonDisabled,
            ]}
            onPress={handleStep2Continue}
            disabled={!weightText || !heightText || !ageText || !gender || isSaving}
          >
            <Text style={styles.bottomButtonText}>Continuar</Text>
            <Feather name="arrow-right" size={18} color={colors.background} />
          </TouchableOpacity>
        )}

        {currentStep === 3 && (
          <TouchableOpacity
            style={[styles.bottomButton, isSaving && styles.bottomButtonDisabled]}
            onPress={handleFinish}
            disabled={isSaving}
          >
            <Text style={styles.bottomButtonText}>Finalizar Configuración</Text>
            <Feather name="check" size={18} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
