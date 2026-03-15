import { StyleSheet } from 'react-native';

export const getLoginStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      marginTop: -2,
    },
    loginButton: {
      marginTop: 8,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    helperText: {
      marginTop: 12,
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 12,
    },
  });
