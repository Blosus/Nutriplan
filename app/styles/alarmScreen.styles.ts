import { Platform, StyleSheet } from 'react-native';

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

export const getAlarmScreenStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
    fontFamily: displayFont,
  },
  time: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
    fontFamily: displayFont,
  },
  desc: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: textFont,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
    fontFamily: textFont,
  }
});