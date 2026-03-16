import { useTheme } from '@/hooks/theme-context';
import { signOutNutriApp, simulateNutriAppRegister } from '@/services/auth';
import { clearCurrentSessionUser } from '@/services/session';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getRegistroStyles } from './styles/registro.styles';

export default function RegistroScreen() {
  const { colors } = useTheme();
  const styles = getRegistroStyles(colors);
  const loginRoute = '/Login' as Href;
  const placeholderColor = 'rgba(140, 140, 140, 0.45)';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      !isLoading
    );
  }, [email, password, confirmPassword, isLoading]);

  const onRegister = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      await simulateNutriAppRegister(
        email.trim(),
        password,
        confirmPassword
      );
      await signOutNutriApp();
      await clearCurrentSessionUser();

      Alert.alert('Registro exitoso', 'Cuenta creada correctamente. Ahora inicia sesión para continuar.', [
        { text: 'Continuar', onPress: () => router.replace(loginRoute) },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo completar el registro. Intentalo de nuevo.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backgroundOrbTop} />
        <View style={styles.backgroundOrbBottom} />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace(loginRoute)}
          >
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Registro</Text>
            <Text style={styles.stepIndicator}>Acceso nuevo</Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.card}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>NutriApp</Text>
          </View>

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Crea tu acceso para guardar tu progreso personal.</Text>

          <View>
            <Text style={styles.label}>Correo electronico</Text>
            <TextInput
              style={[styles.input, !!errorMessage && styles.inputError]}
              placeholder="ejemplo@correo.com"
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View>
            <Text style={styles.label}>Contrasena</Text>
            <TextInput
              style={[styles.input, !!errorMessage && styles.inputError]}
              placeholder="Minimo 6 caracteres"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          <View>
            <Text style={styles.label}>Confirmar contrasena</Text>
            <TextInput
              style={[styles.input, !!errorMessage && styles.inputError]}
              placeholder="Repite la contrasena"
              placeholderTextColor={placeholderColor}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
            disabled={!canSubmit}
            onPress={onRegister}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>Registrarme</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace(loginRoute)}
          >
            <Text style={styles.secondaryButtonText}>Volver al login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
