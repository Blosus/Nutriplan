import { Audio } from 'expo-av';

export class AudioManager {
  private static soundInstance: Audio.Sound | null = null;
  private static isPlaying = false;

  /**
   * Inicia la reproducción de un sonido de alarma
   * @param soundEnabled - Si está habilitado el sonido
   * @param customSoundUri - URI del sonido personalizado (opcional)
   */
  static async startAlarmSound(soundEnabled: boolean, customSoundUri?: string) {
    if (!soundEnabled) {
      return;
    }

    try {
      // Detener cualquier sonido anterior
      await this.stopAlarmSound();

      // Configurar el audio para máximo volumen y reproducción en modo silencioso
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });

      let soundCreated = false;

      // Intentar cargar el sonido personalizado
      if (customSoundUri && !soundCreated) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: customSoundUri },
            { shouldPlay: false, isLooping: true, volume: 1.0 }
          );
          this.soundInstance = sound;
          await this.soundInstance.playAsync();
          this.isPlaying = true;
          soundCreated = true;
          console.log('Custom sound started');
          return;
        } catch (e) {
          console.log('Error loading custom sound, trying embedded:', e);
        }
      }

      // Fallback: intentar cargar el sonido embebido (sonidolol.mp3)
      if (!soundCreated) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sonidolol.mp3'),
            { shouldPlay: false, isLooping: true, volume: 1.0 }
          );
          this.soundInstance = sound;
          await this.soundInstance.playAsync();
          this.isPlaying = true;
          soundCreated = true;
          console.log('Embedded sound started');
          return;
        } catch (e) {
          console.log('Error loading embedded sound:', e);
        }
      }

      // Si llegamos aquí, log del error
      console.error('Failed to play any alarm sound');
    } catch (error) {
      console.error('Error starting alarm sound:', error);
    }
  }

  /**
   * Detiene la reproducción del sonido
   */
  static async stopAlarmSound() {
    try {
      if (this.soundInstance) {
        const status = await this.soundInstance.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await this.soundInstance.stopAsync();
        }
        await this.soundInstance.unloadAsync();
        this.soundInstance = null;
      }
      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping alarm sound:', error);
    }
  }

  /**
   * Pausa la reproducción del sonido
   */
  static async pauseAlarmSound() {
    try {
      if (this.soundInstance && this.isPlaying) {
        await this.soundInstance.pauseAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('Error pausing alarm sound:', error);
    }
  }

  /**
   * Reanuda la reproducción del sonido
   */
  static async resumeAlarmSound() {
    try {
      if (this.soundInstance && !this.isPlaying) {
        await this.soundInstance.playAsync();
        this.isPlaying = true;
      }
    } catch (error) {
      console.error('Error resuming alarm sound:', error);
    }
  }

  /**
   * Verifica si el sonido está reproduciéndose
   */
  static isAlarmSoundPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Limpia recursos de audio
   */
  static async cleanup() {
    await this.stopAlarmSound();
  }
}

export default AudioManager;
