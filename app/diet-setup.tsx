import { useTheme } from "@/hooks/theme-context";
import {
  ALL_WEEKDAYS,
  Alarm,
  cancelAlarmNotifications,
  loadUserAlarms,
  saveUserAlarms,
  scheduleAlarmNotifications,
} from "@/services/alarms";
import { getCurrentSessionUser } from "@/services/session";
import {
  DietActivityLevel,
  DietGender,
  DietGoal,
  DietMealEnabled,
  DietMealSchedule,
  MealTime,
  isDietProfileComplete,
  loadUserDietProfile,
  patchUserDietProfile,
} from "@/services/user-diet-profile";
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
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

const MEAL_ORDER: MealKey[] = [
  "breakfast",
  "midMorning",
  "lunch",
  "afternoon",
  "dinner",
];

const DEFAULT_MEAL_TIMES: DietMealSchedule = {
  breakfast: { hour: 8, minute: 0 },
  midMorning: { hour: 11, minute: 0 },
  lunch: { hour: 13, minute: 0 },
  afternoon: { hour: 17, minute: 0 },
  dinner: { hour: 20, minute: 0 },
};

const DEFAULT_MEAL_ENABLED: DietMealEnabled = {
  breakfast: true,
  midMorning: true,
  lunch: true,
  afternoon: true,
  dinner: true,
};

const ACTIVITY_OPTIONS: {
  value: DietActivityLevel;
  title: string;
  subtitle: string;
}[] = [
  {
    value: "SEDENTARY",
    title: "Sedentario",
    subtitle: "Poco o nada de ejercicio",
  },
  { value: "LIGHT", title: "Ligero", subtitle: "1-3 días por semana" },
  { value: "MODERATE", title: "Moderado", subtitle: "3-5 días por semana" },
  { value: "ACTIVE", title: "Activo", subtitle: "6-7 días por semana" },
  { value: "EXTREME", title: "Extremo", subtitle: "Entrenamiento muy intenso" },
];

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
  const params = useLocalSearchParams<{ startStep?: string }>();
  const { colors } = useTheme();
  const styles = getDietSetupStyles(colors);
  const placeholderColor = "rgba(140, 140, 140, 0.45)";
  const [currentStep, setCurrentStep] = useState<SetupStep>(1);
  const [uid, setUid] = useState("guest");
  const [goal, setGoal] = useState<DietGoal | null>(null);
  const [weightText, setWeightText] = useState("");
  const [heightText, setHeightText] = useState("");
  const [ageText, setAgeText] = useState("");
  const [gender, setGender] = useState<DietGender | null>(null);
  const [activityLevel, setActivityLevel] =
    useState<DietActivityLevel>("SEDENTARY");
  const [mealTimes, setMealTimes] =
    useState<DietMealSchedule>(DEFAULT_MEAL_TIMES);
  const [mealEnabled, setMealEnabled] =
    useState<DietMealEnabled>(DEFAULT_MEAL_ENABLED);
  const [activePicker, setActivePicker] = useState<MealKey | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string>("");

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
      setActivityLevel(profile.activityLevel ?? "SEDENTARY");
      setMealEnabled(profile.mealEnabled ?? DEFAULT_MEAL_ENABLED);
      if (profile.mealSchedule) {
        setMealTimes(profile.mealSchedule);
      }

      if (params.startStep) {
        const forcedStep = Number(params.startStep);
        if (forcedStep >= 1 && forcedStep <= 3) {
          setCurrentStep(forcedStep as SetupStep);
        }
      } else {
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
      }

      setIsHydrated(true);
    };

    void bootstrap();
  }, [params.startStep]);

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
      Alert.alert(
        "Selecciona una opción",
        "Elige Bajar de peso o Mantener peso saludable para continuar.",
      );
      return;
    }

    setIsSaving(true);
    await patchUserDietProfile(uid, {
      goal,
      completedSteps: Math.max(1, currentStep),
    });
    setIsSaving(false);
    setSaveFeedback("Objetivo guardado correctamente.");
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
      Alert.alert(
        "Altura inválida",
        "Ingresa una altura válida entre 80 y 260 cm.",
      );
      return;
    }

    if (!Number.isFinite(age) || age < 10 || age > 120) {
      Alert.alert(
        "Edad inválida",
        "Ingresa una edad válida entre 10 y 120 años.",
      );
      return;
    }

    if (!gender) {
      Alert.alert(
        "Selecciona tu género",
        "Elige hombre o mujer para continuar.",
      );
      return;
    }

    if (!activityLevel) {
      Alert.alert(
        "Selecciona tu nivel de actividad",
        "Elige tu nivel de actividad física para continuar.",
      );
      return;
    }

    setIsSaving(true);
    await patchUserDietProfile(uid, {
      weightKg: Number(weight.toFixed(1)),
      heightCm: Math.round(height),
      age: Math.round(age),
      gender,
      activityLevel,
      completedSteps: Math.max(2, currentStep),
    });
    setIsSaving(false);
    setSaveFeedback("Medidas y actividad guardadas.");
    setCurrentStep(3);
  };

  const handleFinish = async () => {
    setIsSaving(true);

    await patchUserDietProfile(uid, {
      mealSchedule: mealTimes,
      mealEnabled,
      completedSteps: 3,
      setupCompleted: true,
    });

    // Replace any existing meal alarms with the new schedule
    const existingAlarms = await loadUserAlarms(uid);
    const mealNames = Object.values(MEAL_LABELS);
    const alarmsToKeep: Alarm[] = [];
    for (const alarm of existingAlarms) {
      if (mealNames.includes(alarm.name)) {
        await cancelAlarmNotifications(alarm);
      } else {
        alarmsToKeep.push(alarm);
      }
    }

    const newMealAlarms: Alarm[] = [];
    for (let i = 0; i < MEAL_ORDER.length; i++) {
      const key = MEAL_ORDER[i];
      if (!mealEnabled[key]) {
        continue;
      }
      const { hour, minute } = mealTimes[key];
      const name = MEAL_LABELS[key];
      const alarmId = Date.now() + i;

      const scheduled = await scheduleAlarmNotifications({
        id: alarmId,
        hour,
        minute,
        name,
        description: "Alarma de comida",
        weekdays: [...ALL_WEEKDAYS],
      });

      newMealAlarms.push({
        id: alarmId,
        hour,
        minute,
        name,
        description: "Alarma de comida",
        enabled: true,
        weekdays: [...ALL_WEEKDAYS],
        notifId: scheduled.notifId,
        notifIds: scheduled.notifIds,
      });
    }

    await saveUserAlarms(uid, [...alarmsToKeep, ...newMealAlarms]);
    setIsSaving(false);
    Alert.alert(
      "Configuración guardada",
      "Tus cambios se guardaron correctamente.",
    );
    router.back();
  };

  const showHelp = (
    topic: "weight" | "height" | "age" | "activity" | "meals",
  ) => {
    const tips: Record<typeof topic, string> = {
      weight: "Usa tu peso actual en kilogramos. Ejemplo: 68.5",
      height: "Ingresa tu altura en centímetros. Ejemplo: 175",
      age: "Ingresa tu edad actual en años completos.",
      activity:
        "Elige el nivel que mejor represente tu semana promedio de ejercicio.",
      meals: "Si ayunas o no cenas, desactiva ese horario con el interruptor.",
    };

    Alert.alert("Ayuda", tips[topic]);
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

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {stepTitle}
        </Text>

        <View style={styles.stepBadge}>
          <Text
            style={styles.stepBadgeText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {`Paso ${currentStep} de 3`}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {saveFeedback.length > 0 && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={styles.savedBadgeText}>{saveFeedback}</Text>
          </View>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && (
            <>
              <Text style={styles.introText}>
                Selecciona lo que quieres lograr con tu plan nutricional:
              </Text>
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    goal === "LOSE_WEIGHT" && styles.optionCardActive,
                  ]}
                  onPress={() => setGoal("LOSE_WEIGHT")}
                >
                  <View style={styles.optionIcon}>
                    <Feather
                      name="arrow-down"
                      size={28}
                      color={colors.accent}
                    />
                  </View>
                  <Text style={styles.optionTitle}>Bajar de peso</Text>
                  <Text style={styles.optionDescription}>
                    Reducir grasa corporal y lograr un peso más saludable.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    goal === "MAINTAIN_WEIGHT" && styles.optionCardActive,
                  ]}
                  onPress={() => setGoal("MAINTAIN_WEIGHT")}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5
                      name="balance-scale"
                      size={24}
                      color={colors.accent}
                    />
                  </View>
                  <Text style={styles.optionTitle}>
                    Mantener peso saludable
                  </Text>
                  <Text style={styles.optionDescription}>
                    Conservar mi peso actual con hábitos saludables.
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Text style={styles.introText}>
                Ingresa tus datos para personalizar tu plan:
              </Text>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Peso (kg)</Text>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => showHelp("weight")}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.fieldRow}>
                  <MaterialIcons
                    name="monitor-weight"
                    size={22}
                    color={colors.accent}
                  />
                  <TextInput
                    style={styles.input}
                    value={weightText}
                    onChangeText={setWeightText}
                    placeholder="Ej: 68.5"
                    placeholderTextColor={placeholderColor}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
                <Text style={styles.exampleHint}>
                  Ejemplo recomendado: 68.5 kg
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Altura (cm)</Text>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => showHelp("height")}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.fieldRow}>
                  <MaterialIcons
                    name="height"
                    size={22}
                    color={colors.accent}
                  />
                  <TextInput
                    style={[styles.input, { width: 100 }]}
                    value={heightText}
                    onChangeText={setHeightText}
                    placeholder="Ej: 175"
                    placeholderTextColor={placeholderColor}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
                <Text style={styles.exampleHint}>
                  Ejemplo recomendado: 175 cm
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Edad</Text>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => showHelp("age")}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.fieldRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={colors.accent}
                  />
                  <TextInput
                    style={[styles.input, { width: 90 }]}
                    value={ageText}
                    onChangeText={setAgeText}
                    placeholder="Ej: 24"
                    placeholderTextColor={placeholderColor}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.unitText}>años</Text>
                </View>
                <Text style={styles.exampleHint}>
                  Ejemplo recomendado: 24 años
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Género</Text>
                <View style={styles.genderChoices}>
                  <TouchableOpacity
                    style={[
                      styles.genderChoice,
                      gender === "MALE" && styles.genderChoiceActive,
                    ]}
                    onPress={() => setGender("MALE")}
                  >
                    <Ionicons
                      name="male-outline"
                      size={20}
                      color={colors.accent}
                    />
                    <Text style={styles.genderChoiceText}>Hombre</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.genderChoice,
                      gender === "FEMALE" && styles.genderChoiceActive,
                    ]}
                    onPress={() => setGender("FEMALE")}
                  >
                    <Ionicons
                      name="female-outline"
                      size={20}
                      color={colors.accent}
                    />
                    <Text style={styles.genderChoiceText}>Mujer</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Actividad física</Text>
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => showHelp("activity")}
                  >
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color={colors.accent}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.activityList}>
                  {ACTIVITY_OPTIONS.map((option) => {
                    const active = activityLevel === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.activityOption,
                          active && styles.activityOptionActive,
                        ]}
                        onPress={() => setActivityLevel(option.value)}
                      >
                        <View>
                          <Text style={styles.activityTitle}>
                            {option.title}
                          </Text>
                          <Text style={styles.activitySubtitle}>
                            {option.subtitle}
                          </Text>
                        </View>
                        {active && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={colors.accent}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.accent}
                />
                <Text style={styles.infoText}>
                  Peso, altura, edad y género nos ayudan a estimar mejor tus
                  necesidades calóricas diarias.
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
                        <Ionicons
                          name="sunny"
                          size={22}
                          color={colors.accent}
                        />
                      )}
                      {mealKey === "midMorning" && (
                        <FontAwesome5
                          name="coffee"
                          size={19}
                          color={colors.accent}
                        />
                      )}
                      {mealKey === "lunch" && (
                        <MaterialIcons
                          name="restaurant"
                          size={22}
                          color={colors.accent}
                        />
                      )}
                      {mealKey === "afternoon" && (
                        <FontAwesome5
                          name="apple-alt"
                          size={19}
                          color={colors.accent}
                        />
                      )}
                      {mealKey === "dinner" && (
                        <Ionicons name="moon" size={22} color={colors.accent} />
                      )}
                    </View>
                    <View style={styles.mealContent}>
                      <Text style={styles.mealTitle}>
                        {MEAL_LABELS[mealKey]}
                      </Text>
                      <TouchableOpacity
                        style={styles.mealTimeButton}
                        onPress={() => setActivePicker(mealKey)}
                        disabled={!mealEnabled[mealKey]}
                      >
                        <Text style={styles.mealTimeText}>
                          {formatMealTime(mealTimes[mealKey])}
                        </Text>
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <View style={styles.mealToggleRow}>
                        <Text style={styles.mealToggleText}>
                          {mealEnabled[mealKey]
                            ? "Horario activo"
                            : "Horario desactivado"}
                        </Text>
                        <Switch
                          value={mealEnabled[mealKey]}
                          onValueChange={(value) =>
                            setMealEnabled((prev) => ({
                              ...prev,
                              [mealKey]: value,
                            }))
                          }
                          trackColor={{
                            false: colors.border,
                            true: colors.accent + "66",
                          }}
                          thumbColor={
                            mealEnabled[mealKey]
                              ? colors.accent
                              : colors.textSecondary
                          }
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="bulb-outline" size={20} color={colors.accent} />
                <Text style={styles.infoText}>
                  Estos horarios nos ayudarán a recordarte cuándo es tiempo de
                  cada comida.
                </Text>
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => showHelp("meals")}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={18}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>

              <DateTimePickerModal
                isVisible={activePicker !== null}
                mode="time"
                date={
                  activePicker
                    ? mealTimeToDate(mealTimes[activePicker])
                    : new Date()
                }
                onConfirm={(date) => {
                  if (activePicker) {
                    setMealTimes((prev) => ({
                      ...prev,
                      [activePicker]: {
                        hour: date.getHours(),
                        minute: date.getMinutes(),
                      },
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
            style={[
              styles.bottomButton,
              (!goal || isSaving) && styles.bottomButtonDisabled,
            ]}
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
              (!weightText || !heightText || !ageText || !gender || isSaving) &&
                styles.bottomButtonDisabled,
            ]}
            onPress={handleStep2Continue}
            disabled={
              !weightText || !heightText || !ageText || !gender || isSaving
            }
          >
            <Text style={styles.bottomButtonText}>Continuar</Text>
            <Feather name="arrow-right" size={18} color={colors.background} />
          </TouchableOpacity>
        )}

        {currentStep === 3 && (
          <TouchableOpacity
            style={[
              styles.bottomButton,
              isSaving && styles.bottomButtonDisabled,
            ]}
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
