import { useTheme } from "@/hooks/theme-context";
import type { FoodCategory } from "@/services/food-database";
import { getCurrentSessionUser } from "@/services/session";
import { addCustomFood } from "@/services/user-custom-foods";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getIndexStyles } from "./styles/index.styles";

type NewFoodForm = {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fats: string;
  fiber: string;
  portionUnit: string;
  portionGrams: string;
  category: FoodCategory;
};

const EMPTY_FORM: NewFoodForm = {
  name: "",
  kcal: "",
  protein: "",
  carbs: "",
  fats: "",
  fiber: "0",
  portionUnit: "",
  portionGrams: "",
  category: "frutas",
};

const FOOD_CATEGORY_OPTIONS: { key: FoodCategory; label: string }[] = [
  { key: "frutas", label: "Frutas" },
  { key: "verduras", label: "Verduras" },
  { key: "cereales", label: "Cereales" },
  { key: "grasas", label: "Grasas" },
  { key: "leguminosas", label: "Leguminosas" },
  { key: "lacteos", label: "Lácteos" },
  { key: "chucherias", label: "Chucherías" },
];

const parseDecimalInput = (value: string): number | null => {
  const parsed = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const showFieldHelp = (field: keyof NewFoodForm) => {
  const map: Record<keyof NewFoodForm, { title: string; text: string }> = {
    name: {
      title: "Nombre",
      text: "Nombre con el que quieres encontrar este alimento en la búsqueda.",
    },
    kcal: {
      title: "Calorías",
      text: "Calorías por cada 100 gramos del alimento.",
    },
    protein: {
      title: "Proteína",
      text: "Proteína en gramos por cada 100 gramos.",
    },
    carbs: {
      title: "Carbohidratos",
      text: "Carbohidratos en gramos por cada 100 gramos.",
    },
    fats: {
      title: "Grasas",
      text: "Grasas en gramos por cada 100 gramos.",
    },
    fiber: {
      title: "Fibra",
      text: "Fibra en gramos por cada 100 gramos.",
    },
    portionUnit: {
      title: "Unidad de porción",
      text: "Opcional. Ejemplo: pieza, taza, cucharada.",
    },
    portionGrams: {
      title: "Gramos por porción",
      text: "Opcional. Si defines unidad, también agrega cuántos gramos pesa.",
    },
    category: {
      title: "Categoría",
      text: "Agrupa tu alimento para filtrarlo más fácil en la búsqueda.",
    },
  };
  Alert.alert(map[field].title, map[field].text);
};

function FieldLabel({
  label,
  onHelp,
  textColor,
  accentColor,
}: {
  label: string;
  onHelp: () => void;
  textColor: string;
  accentColor: string;
}) {
  return (
    <View style={localStyles.fieldLabelRow}>
      <Text style={[localStyles.fieldLabelText, { color: textColor }]}>
        {label}
      </Text>
      <TouchableOpacity onPress={onHelp}>
        <Ionicons name="help-circle-outline" size={18} color={accentColor} />
      </TouchableOpacity>
    </View>
  );
}

export default function NewFoodScreen() {
  const { colors } = useTheme();
  const styles = getIndexStyles(colors);
  const placeholderColor = "rgba(140, 140, 140, 0.45)";
  const [form, setForm] = useState<NewFoodForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const onSave = async () => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert("Nombre requerido", "Escribe el nombre de la comida.");
      return;
    }

    const kcal = parseDecimalInput(form.kcal);
    const protein = parseDecimalInput(form.protein);
    const carbs = parseDecimalInput(form.carbs);
    const fats = parseDecimalInput(form.fats);
    const fiber = parseDecimalInput(form.fiber);

    if (
      kcal == null ||
      protein == null ||
      carbs == null ||
      fats == null ||
      fiber == null
    ) {
      Alert.alert(
        "Valores inválidos",
        "Revisa calorías, proteínas, carbohidratos, grasas y fibra.",
      );
      return;
    }

    const portionUnit = form.portionUnit.trim();
    const portionGramsText = form.portionGrams.trim();
    const portionGrams = parseDecimalInput(form.portionGrams);
    const hasPortionUnit = portionUnit.length > 0;
    const hasPortionGrams = portionGrams != null && portionGrams > 0;

    if (hasPortionUnit && !hasPortionGrams) {
      Alert.alert(
        "Porción incompleta",
        "Si defines unidad de porción, también debes indicar gramos por porción (mayor a 0).",
      );
      return;
    }

    if (!hasPortionUnit && portionGramsText.length > 0) {
      Alert.alert(
        "Porción incompleta",
        "Si llenas gramos por porción, también debes indicar la unidad de porción.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const sessionUser = await getCurrentSessionUser();
      const uid = sessionUser?.uid ?? "guest";
      await addCustomFood(uid, {
        name,
        kcal,
        protein,
        carbs,
        fats,
        fiber,
        category: form.category,
        portion: hasPortionUnit
          ? { cantidad: 1, unidad: portionUnit, gramos: portionGrams as number }
          : null,
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Nuevo alimento</Text>
          <Text style={styles.stepIndicator}>Personalizado</Text>
        </View>

        <View style={styles.backButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Información nutricional</Text>
          <Text style={styles.dailyStatusText}>
            Llena los datos por cada 100 gramos para calcular macros
            correctamente.
          </Text>

          <View style={[localStyles.fieldGroup, localStyles.nameFieldGroup]}>
            <FieldLabel
              label="Nombre"
              onHelp={() => showFieldHelp("name")}
              textColor={colors.text}
              accentColor={colors.accent}
            />
            <TextInput
              value={form.name}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, name: value }))
              }
              placeholder="Ej: Torta de pollo casera"
              placeholderTextColor={placeholderColor}
              style={[styles.customFoodInput, localStyles.inputReadable]}
            />
          </View>

          <View style={[styles.customFoodGridRow, localStyles.gridSpacing]}>
            <View style={localStyles.inputColumn}>
              <FieldLabel
                label="Calorías"
                onHelp={() => showFieldHelp("kcal")}
                textColor={colors.text}
                accentColor={colors.accent}
              />
              <TextInput
                value={form.kcal}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, kcal: value }))
                }
                placeholder="kcal / 100g"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
                style={[styles.customFoodInputHalf, localStyles.inputReadable]}
              />
            </View>
            <View style={localStyles.inputColumn}>
              <FieldLabel
                label="Proteína"
                onHelp={() => showFieldHelp("protein")}
                textColor={colors.text}
                accentColor={colors.accent}
              />
              <TextInput
                value={form.protein}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, protein: value }))
                }
                placeholder="g / 100g"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
                style={[styles.customFoodInputHalf, localStyles.inputReadable]}
              />
            </View>
          </View>

          <View style={[styles.customFoodGridRow, localStyles.gridSpacing]}>
            <View style={localStyles.inputColumn}>
              <FieldLabel
                label="Carbohidratos"
                onHelp={() => showFieldHelp("carbs")}
                textColor={colors.text}
                accentColor={colors.accent}
              />
              <TextInput
                value={form.carbs}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, carbs: value }))
                }
                placeholder="g / 100g"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
                style={[styles.customFoodInputHalf, localStyles.inputReadable]}
              />
            </View>
            <View style={localStyles.inputColumn}>
              <FieldLabel
                label="Grasas"
                onHelp={() => showFieldHelp("fats")}
                textColor={colors.text}
                accentColor={colors.accent}
              />
              <TextInput
                value={form.fats}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, fats: value }))
                }
                placeholder="g / 100g"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
                style={[styles.customFoodInputHalf, localStyles.inputReadable]}
              />
            </View>
          </View>

          <View style={localStyles.fieldGroup}>
            <FieldLabel
              label="Fibra"
              onHelp={() => showFieldHelp("fiber")}
              textColor={colors.text}
              accentColor={colors.accent}
            />
            <TextInput
              value={form.fiber}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, fiber: value }))
              }
              placeholder="g / 100g"
              placeholderTextColor={placeholderColor}
              keyboardType="decimal-pad"
              style={[styles.customFoodInput, localStyles.inputReadable]}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Porción y categoría</Text>

          <View style={[styles.customFoodGridRow, localStyles.gridSpacing]}>
            <View style={localStyles.inputColumn}>
              <FieldLabel
                label="Unidad porción"
                onHelp={() => showFieldHelp("portionUnit")}
                textColor={colors.text}
                accentColor={colors.accent}
              />
              <TextInput
                value={form.portionUnit}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, portionUnit: value }))
                }
                placeholder="Ej: pieza"
                placeholderTextColor={placeholderColor}
                style={[styles.customFoodInputHalf, localStyles.inputReadable]}
              />
            </View>
            <View style={localStyles.inputColumn}>
              <FieldLabel
                label="Gramos por porción"
                onHelp={() => showFieldHelp("portionGrams")}
                textColor={colors.text}
                accentColor={colors.accent}
              />
              <TextInput
                value={form.portionGrams}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, portionGrams: value }))
                }
                placeholder="Ej: 180"
                placeholderTextColor={placeholderColor}
                keyboardType="decimal-pad"
                style={[styles.customFoodInputHalf, localStyles.inputReadable]}
              />
            </View>
          </View>

          <FieldLabel
            label="Categoría"
            onHelp={() => showFieldHelp("category")}
            textColor={colors.text}
            accentColor={colors.accent}
          />
          <View style={styles.nutritionCategoriesRow}>
            {FOOD_CATEGORY_OPTIONS.map((category) => {
              const isSelected = form.category === category.key;
              return (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.nutritionCategoryChip,
                    isSelected && styles.nutritionCategoryChipActive,
                  ]}
                  onPress={() =>
                    setForm((prev) => ({ ...prev, category: category.key }))
                  }
                >
                  <Text
                    style={[
                      styles.nutritionCategoryText,
                      isSelected && styles.nutritionCategoryTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.nutritionActionButton, isSaving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Ionicons
                name="save-outline"
                size={16}
                color={colors.background}
              />
            )}
            <Text style={styles.nutritionActionButtonText}>
              Guardar alimento
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldLabelText: {
    fontSize: 13,
    fontWeight: "700",
  },
  inputColumn: {
    flex: 1,
    gap: 6,
  },
  fieldGroup: {
    gap: 6,
  },
  nameFieldGroup: {
    marginBottom: 10,
  },
  gridSpacing: {
    marginTop: 0,
    marginBottom: 8,
  },
  inputReadable: {
    fontSize: 15,
    minHeight: 44,
    paddingVertical: 10,
  },
});
