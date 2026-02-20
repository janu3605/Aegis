import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, FAKE_CALL_DEFAULTS } from '../constants';
import { FakeCallEvent } from '../types';

export class FakeCallService {
  private static sound: Audio.Sound | null = null;
  private static callDuration = FAKE_CALL_DEFAULTS.duration;

  /**
   * Start a fake incoming call
   */
  static async startFakeCall(callerName: string = 'Mom'): Promise<void> {
    try {
      // Create a simple audio context (beep sound)
      await this.playRingTone();

      // Log the fake call event
      await this.logFakeCallEvent(callerName);
    } catch (error) {
      console.error('Error starting fake call:', error);
    }
  }

  /**
   * Play a ringtone sound
   */
  private static async playRingTone(): Promise<void> {
    try {
      // For now, use a built-in system sound or create a placeholder
      // In production, integrate with Twilio or similar for realistic call audio
      const sound = new Audio.Sound();
      
      // Access the native sound playback
      // This is a placeholder - in production you'd use actual ringtone audio
      console.log('Playing ringtone...');
      
      // Simulate ringtone playing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.sound = sound;
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  }

  /**
   * End the fake call
   */
  static async endFakeCall(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Error ending fake call:', error);
    }
  }

  /**
   * Log fake call event to storage
   */
  private static async logFakeCallEvent(callerName: string): Promise<void> {
    try {
      const history = await this.getFakeCallHistory();
      const event: FakeCallEvent = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        callerName,
        duration: this.callDuration,
      };
      history.push(event);
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAKE_CALL_HISTORY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Error logging fake call:', error);
    }
  }

  /**
   * Get fake call history
   */
  static async getFakeCallHistory(): Promise<FakeCallEvent[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.FAKE_CALL_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error retrieving fake call history:', error);
      return [];
    }
  }

  /**
   * Schedule a fake call for later
   */
  static async scheduleFakeCall(
    delayInSeconds: number,
    callerName: string = 'Mom'
  ): Promise<string> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.startFakeCall(callerName);
        resolve(timeoutId.toString());
      }, delayInSeconds * 1000);
    });
  }
}

export default FakeCallService;
