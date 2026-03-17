# Sistema de Sonidos y Vibración de Alarmas - Guía Completa

## ✅ Quest Completado: Implementación de Sistema de Audio Robusto

### 📁 Archivos Implementados

#### 1. **services/audio.ts** - AudioManager
Manager estático para la reproducción de sonidos de alarma.

**Características:**
- ✅ Reproducción en loop constante
- ✅ Fallback a sonido embebido (sonidolol.mp3) si no hay personalizado
- ✅ Modo silencioso (playsInSilentModeIOS, shouldDuckAndroid)
- ✅ Volumen máximo (1.0)
- ✅ Métodos: `startAlarmSound`, `stopAlarmSound`, `pauseAlarmSound`, `resumeAlarmSound`

**Chain de fallback:**
```
1. Sonido personalizado (customSoundUri)
   ↓ (si falla)
2. assets/sonidolol.mp3 (embebido)
   ↓ (si ambos fallan)
3. Sin sonido (Modo silencioso)
```

#### 2. **services/vibration.ts** - VibrationManager
Manager para patrones de vibración mejorados.

**Patrones disponibles:**
- `GENTLE`: 100ms vibración, 100ms pausa
- `NORMAL`: 200ms vibración, 150ms pausa (default para alarmas)
- `STRONG`: 300ms vibración, 200ms pausa
- `PULSE`: 3 pulsos cortos: [100, 50, 100, 50]
- `WAVE`: Patrón ascendente: [50, 100, 150, 100]

#### 3. **services/sound-settings.ts**
Gestión de configuraciones de sonido personalizadas.

**Funciones:**
- `getSoundSettings()`: Lee configuración guardada
- `saveSoundSettings()`: Guarda configuración personalizada
- `clearSoundSettings()`: Limpia la configuración

#### 4. **hooks/use-alarm-sound.ts**
Hook React para usar el sistema de audio.

```tsx
const { soundUri, isLoading, playAlarmSound, stopAlarmSound } = useAlarmSound();
```

#### 5. **app/(tabs)/alarmScreen.tsx** - ACTUALIZADO
Pantalla que se muestra cuando suena una alarma.

**Mejoras:**
- ✅ Carga configuraciones de usuario (sonido, vibración)
- ✅ Inicia audio Y vibración simultáneamente
- ✅ Usa AudioManager y VibrationManager
- ✅ Detiene ambos al cerrar
- ✅ Respeta preferencias del usuario

#### 6. **app/(tabs)/ajustes.tsx** - ACTUALIZADO
Pantalla de configuración mejorada.

**Cambios:**
- ✅ Hints informativos sobre sonido actual
- ✅ Información de patrón de vibración
- ✅ Switches interdependientes
- ✅ Mejor UI/UX con descripciones

---

## 🎵 Flujo de Funcionamiento

### Cuando suena una alarma:

```
1. AlarmScreen se carga
   ├─ Carga configuraciones de usuario
   ├─ Lee soundEnabled y vibracionEnabled
   └─ Lee soundUri personalizado (si existe)

2. useEffect inicia la alarma
   ├─ VibrationManager.startVibration('NORMAL')
   └─ AudioManager.startAlarmSound(soundEnabled, soundUri)

3. AudioManager inicia sonido
   ├─ Configura audio en modo máximo
   ├─ Intenta sonido personalizado
   ├─ Fallback a assets/sonidolol.mp3
   └─ Reproduce en loop indefinido

4. Usuario presiona "Detener"
   ├─ VibrationManager.stopVibration()
   ├─ AudioManager.stopAlarmSound()
   └─ Navega de vuelta
```

---

## 📋 Configuración de Audio

### Audio Mode:
```typescript
{
  playsInSilentModeIOS: true,      // Suena en silencioso
  staysActiveInBackground: true,   // Continúa en background
  shouldDuckAndroid: false,        // No reduce otros audios
  allowsRecordingIOS: false,       // No interfiere con grabación
}
```

### Sound Creation:
```typescript
{
  shouldPlay: false,        // se controla manualmente
  isLooping: true,         // repetición infinita
  volume: 1.0              // máximo volumen (0.0 - 1.0)
}
```

---

## 🔧 Cómo Usar

### En Componentes:

```tsx
import AudioManager from '@/services/audio';

// Iniciar sonido
await AudioManager.startAlarmSound(true, customUri);

// Detener sonido
await AudioManager.stopAlarmSound();

// Pausar/Reanudar
await AudioManager.pauseAlarmSound();
await AudioManager.resumeAlarmSound();
```

### Con Hook:

```tsx
import useAlarmSound from '@/hooks/use-alarm-sound';

function MyComponent() {
  const { playAlarmSound, stopAlarmSound } = useAlarmSound();
  
  return (
    <Button 
      onPress={() => playAlarmSound(true)}
      title="Reproducir"
    />
  );
}
```

### Vibración:

```tsx
import VibrationManager from '@/services/vibration';

// Iniciar con patrón
VibrationManager.startVibration('NORMAL');

// Detener
VibrationManager.stopVibration();
```

---

## 📁 Asset Requerido

El archivo `assets/sonidolol.mp3` debe existir para el fallback.

```
AlarmasApp/
├─ assets/
│  └─ sonidolol.mp3 ✅ (ya existe)
```

---

## 🎯 Funcionalidades Por Implementar (Opcional)

### 1. Selector de Sonidos Personalizado
```tsx
// En ajustes.tsx - permitir usuario cargar archivo mp3
import * as DocumentPicker from 'expo-document-picker';

const selectCustomSound = async () => {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
  if (result.assets?.[0]) {
    await saveSoundSettings({
      soundUri: result.assets[0].uri,
      soundName: result.assets[0].name,
      useDefaultSound: false,
    });
  }
};
```

### 2. Selector de Patrones de Vibración
```tsx
// Permitir usuario elegir entre GENTLE, NORMAL, STRONG, PULSE, WAVE
const [vibrationPattern, setVibrationPattern] = useState('NORMAL');
```

### 3. Vista Previa de Sonido
```tsx
// Botón para probar el sonido antes de guardar
const previewSound = async () => {
  await AudioManager.startAlarmSound(true);
  setTimeout(() => AudioManager.stopAlarmSound(), 3000);
};
```

### 4. Duración Configurable de Vibración
```tsx
// O dejar que vibre indefinidamente como ahora
```

---

## 📊 Estado Actual de Funcionalidades

| Funcionalidad | Estado | Ubicación |
|---|---|---|
| Sonido en loop | ✅ | AudioManager |
| Fallback a default | ✅ | AudioManager |
| Vibración continua | ✅ | VibrationManager |
| Controles en ajustes | ✅ | ajustes.tsx |
| Hints informativos | ✅ | ajustes.tsx |
| Cargar sonido personalizado | ⏳ | Por implementar |
| Selector de patrones | ⏳ | Por implementar |
| Vista previa de sonido | ⏳ | Por implementar |

---

## ✨ Notas Importantes

- **Audio en Loop**: El sonido nunca se detiene por sí solo, solo cuando el usuario lo detiene
- **Fallback Robusto**: Si falla algo, intenta el siguiente sin crashes
- **Modo Silencioso**: En iOS suena incluso con silencio
- **Background**: Continúa reproduciendo incluso si la app está en background
- **Configuración Persistente**: Las preferencias se guardan en AsyncStorage
- **User-Aware**: Respeta las preferencias del usuario para sonido y vibración

---

## 🐛 Debugging

### Ver logs en consola:
```
// En AudioManager:
- "Custom sound started"
- "Embedded sound started"
- "Error loading custom sound"
- "Error loading embedded sound"
```

### Probar en device:
1. Silencia el teléfono
2. Crea una alarma
3. Verifica que suene música en loop + vibraciones
4. Presiona "Detener" para verificar que frena

---

## 📖 Referencias

- `expo-av`: Audio.Sound para reproducción
- `expo-notifications`: Para fallback a notificaciones
- `react-native`: Vibration (aunque usamos VibrationManager)

