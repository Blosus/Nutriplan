import { useTheme } from '@/hooks/theme-context';
import { signInNutriApp } from '@/services/auth';
import { auth } from '@/services/firebase';
import {
  clearCurrentSessionUser,
  clearPendingLoginRedirectAfterRegister,
  hasPendingLoginRedirectAfterRegister,
  setCurrentSessionUser,
} from '@/services/session';
import { onAuthStateChanged } from 'firebase/auth';
import { router, type Href, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getLoginStyles } from './styles/login.styles';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = getLoginStyles(colors);
  const registerRoute = '/registro' as Href;
  const placeholderColor = 'rgba(140, 140, 140, 0.45)';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const shouldStayOnLoginAfterRegisterRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
    let unsubscribe: (() => void) | null = null;

    const setupAuthListener = async () => {
      shouldStayOnLoginAfterRegisterRef.current =
        await hasPendingLoginRedirectAfterRegister();

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (shouldStayOnLoginAfterRegisterRef.current) {
          if (!firebaseUser) {
            await clearCurrentSessionUser();
            await clearPendingLoginRedirectAfterRegister();
            shouldStayOnLoginAfterRegisterRef.current = false;
            setIsCheckingSession(false);
          }
          return;
        }

        if (firebaseUser) {
          await setCurrentSessionUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
          });
          router.replace('/(tabs)');
        } else {
          await clearCurrentSessionUser();
        }
        setIsCheckingSession(false);
      });
    };

    void setupAuthListener();

    return () => {
      unsubscribe?.();
    };
    }, [])
  );

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      !isLoading &&
      !isCheckingSession
    );
  }, [email, password, isLoading, isCheckingSession]);

  const onLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await signInNutriApp(email.trim(), password);
      await setCurrentSessionUser(user);
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesion. Intentalo de nuevo.';
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

        <View style={styles.card}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>NutriApp</Text>
          </View>

          <Text style={styles.title}>Iniciar sesion</Text>
          <Text style={styles.subtitle}>Accede a tus alarmas y a tu progreso diario.</Text>

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
              placeholder="Tu contrasena"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <TouchableOpacity
            style={[styles.loginButton, !canSubmit && styles.loginButtonDisabled]}
            disabled={!canSubmit}
            onPress={onLogin}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push(registerRoute)}
          >
            <Text style={styles.secondaryButtonText}>Crear una cuenta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
