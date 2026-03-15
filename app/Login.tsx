import { useTheme } from '@/hooks/theme-context';
import { simulateNutriAppLogin } from '@/services/auth';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getLoginStyles } from './styles/login.styles';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = getLoginStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !isLoading;
  }, [email, password, isLoading]);

  const onLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await simulateNutriAppLogin(email.trim(), password);
      Alert.alert('Login correcto', `Bienvenido ${user.email}`);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesion</Text>
        <Text style={styles.subtitle}>NutriApp</Text>

        <View>
          <Text style={styles.label}>Correo electronico</Text>
          <TextInput
            style={[styles.input, !!errorMessage && styles.inputError]}
            placeholder="ejemplo@correo.com"
            placeholderTextColor={colors.textSecondary}
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
            placeholderTextColor={colors.textSecondary}
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

        <Text style={styles.helperText}>
          Firebase NutriApp ya esta configurado. El login sigue simulado hasta que actives
          Email/Password en Firebase Auth.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
