import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/theme-context";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Alert, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { CustomSound, deleteCustomSound, readLocalSounds, syncSoundsFromCloud, uploadCustomSound } from "@/services/user-sounds";

interface SoundPickerProps {
  visible: boolean;
  currentSound: string;
  uid: string;
  onSelect: (soundName: string, soundUri: string | null) => void;
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

export function SoundPicker({ visible, currentSound, uid, onSelect, onClose }: SoundPickerProps) {
  const { colors } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);

  const loadSounds = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (uid !== "guest") {
        await syncSoundsFromCloud(uid);
      }
      const sounds = await readLocalSounds(uid);
      setCustomSounds(sounds);
    } catch (error) {
      console.error("Error loading sounds:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [uid]);

  useEffect(() => {
    if (visible) {
      void loadSounds();
    }
  }, [visible, loadSounds]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*", "audio/mpeg", "audio/wav", "audio/mp4"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const name = asset.name ?? `sonido_${Date.now()}.mp3`;

      setIsUploading(true);
      const newSound = await uploadCustomSound(uid, asset.uri, name);
      setCustomSounds((prev) => [...prev, newSound]);
      onSelect(newSound.name, newSound.downloadUrl);
      onClose();
    } catch (error) {
      console.error("Error uploading sound:", error);
      Alert.alert("Error", "No se pudo cargar el archivo de audio. Inténtalo de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSound = (sound: CustomSound) => {
    Alert.alert(
      "Eliminar sonido",
      `¿Eliminar "${sound.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCustomSound(uid, sound.fileName);
              setCustomSounds((prev) => prev.filter((s) => s.fileName !== sound.fileName));
              // Si era el sonido activo, volver al default
              if (currentSound === sound.name) {
                onSelect("sonidolol.mp3", null);
              }
            } catch (error) {
              console.error("Error deleting sound:", error);
            }
          },
        },
      ]
    );
  };

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Sonido</Text>
            {isSyncing
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <View style={{ width: 28 }} />
            }
          </View>

          {/* Content */}
          <ScrollView style={styles.soundList}>
            {/* Default sound */}
            <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
              Sonido Predeterminado
            </Text>

            <TouchableOpacity
              style={[
                styles.soundItem,
                {
                  backgroundColor: currentSound === 'sonidolol.mp3' ? colors.accent + "20" : colors.background,
                  borderColor: currentSound === 'sonidolol.mp3' ? colors.accent : colors.border,
                },
              ]}
              onPress={() => {
                onSelect('sonidolol.mp3', null);
                onClose();
              }}
            >
              <View style={styles.soundInfo}>
                <Ionicons name="musical-note" size={20} color={colors.accent} />
                <View style={styles.soundMeta}>
                  <Text style={[styles.soundName, { color: colors.text }]}>Sonido Default</Text>
                  <Text style={[styles.soundDesc, { color: colors.textSecondary }]}>
                    Sonido incluido en la app
                  </Text>
                </View>
              </View>
              {currentSound === 'sonidolol.mp3' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </TouchableOpacity>

            {/* Custom uploaded sounds */}
            {customSounds.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
                  Mis Sonidos
                </Text>
                {customSounds.map((sound) => (
                  <TouchableOpacity
                    key={sound.fileName}
                    style={[
                      styles.soundItem,
                      {
                        backgroundColor: currentSound === sound.name ? colors.accent + "20" : colors.background,
                        borderColor: currentSound === sound.name ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      onSelect(sound.name, sound.downloadUrl);
                      onClose();
                    }}
                    onLongPress={() => handleDeleteSound(sound)}
                  >
                    <View style={styles.soundInfo}>
                      <Ionicons name="musical-notes" size={20} color={colors.accent} />
                      <View style={styles.soundMeta}>
                        <Text style={[styles.soundName, { color: colors.text }]} numberOfLines={1}>
                          {sound.name}
                        </Text>
                        <Text style={[styles.soundDesc, { color: colors.textSecondary }]}>
                          Mantén presionado para eliminar
                        </Text>
                      </View>
                    </View>
                    {currentSound === sound.name
                      ? <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      : <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                    }
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.divider} />

            <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
              Agregar Sonido
            </Text>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                { backgroundColor: colors.accent + "20", borderColor: colors.accent },
                isUploading && styles.disabledSound,
              ]}
              onPress={handlePickFile}
              disabled={isUploading}
            >
              {isUploading
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
              }
              <View style={styles.uploadInfo}>
                <Text style={[styles.uploadTitle, { color: colors.accent }]}>
                  {isUploading ? 'Subiendo...' : 'Seleccionar Archivo de Audio'}
                </Text>
                <Text style={[styles.uploadDesc, { color: colors.textSecondary }]}>
                  {uid === "guest"
                    ? "Archivo local (inicia sesión para sincronizar)"
                    : "Se guarda en la nube para todos tus dispositivos"}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Info */}
          <View style={[styles.footerInfo, { borderTopColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              El sonido se reproducirá en loop cuando suene la alarma
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
  soundList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
    fontFamily: textFont,
  },
  soundItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  disabledSound: {
    opacity: 0.7,
  },
  soundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  soundMeta: {
    flex: 1,
    gap: 4,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: textFont,
  },
  soundDesc: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: textFont,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  uploadInfo: {
    flex: 1,
    gap: 4,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: textFont,
  },
  uploadDesc: {
    fontSize: 12,
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

export default SoundPicker;
