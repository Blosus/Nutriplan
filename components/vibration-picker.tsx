import { VIBRATION_PATTERNS, VibrationType } from "@/services/vibration";
import VibrationManager from "@/services/vibration";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/theme-context";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from "react-native";

interface VibrationPickerProps {
  visible: boolean;
  currentPattern: VibrationType;
  onSelect: (pattern: VibrationType) => void;
  onClose: () => void;
}

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

const PATTERN_DESCRIPTIONS: Record<VibrationType, string> = {
  GENTLE: "Suave: vibración suave y discreta",
  NORMAL: "Normal: patrón equilibrado",
  STRONG: "Fuerte: vibración potente y perceptible",
  PULSE: "Pulso: tres vibraciones cortas consecutivas",
  WAVE: "Onda: patrón ascendente",
};

export function VibrationPicker({ visible, currentPattern, onSelect, onClose }: VibrationPickerProps) {
  const { colors } = useTheme();

  const handleSelectPattern = (pattern: VibrationType) => {
    // Previsualizar
    VibrationManager.stopVibration();
    VibrationManager.startVibration(pattern);
    
    // Seleccionar después de 1 segundo (para que termine la vibración de prueba)
    setTimeout(() => {
      onSelect(pattern);
      VibrationManager.stopVibration();
      onClose();
    }, 1000);
  };

  const patterns: VibrationType[] = ['GENTLE', 'NORMAL', 'STRONG', 'PULSE', 'WAVE'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.accent} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Patrón de Vibración</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Content */}
          <ScrollView style={styles.patternList}>
            {patterns.map((pattern) => (
              <TouchableOpacity
                key={pattern}
                style={[
                  styles.patternItem,
                  {
                    backgroundColor: currentPattern === pattern ? colors.accent + "20" : colors.background,
                    borderColor: currentPattern === pattern ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => handleSelectPattern(pattern)}
              >
                <View style={styles.patternInfo}>
                  <Text style={[styles.patternName, { color: colors.accent }]}>
                    {pattern}
                  </Text>
                  <Text style={[styles.patternDesc, { color: colors.textSecondary }]}>
                    {PATTERN_DESCRIPTIONS[pattern]}
                  </Text>
                </View>
                {currentPattern === pattern && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer Info */}
          <View style={[styles.footerInfo, { borderTopColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Selecciona un patrón para previsualizarlo
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: displayFont,
  },
  patternList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  patternItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  patternInfo: {
    flex: 1,
    gap: 4,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: textFont,
  },
  patternDesc: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: textFont,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: textFont,
  },
});

export default VibrationPicker;
