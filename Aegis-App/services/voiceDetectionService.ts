// Voice Detection Service - Records short clips and detects distress keywords

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { VOICE_CONFIG } from '@/utils/constants';

export type VoiceDetectionEvent = {
  transcript: string;
  keyword: string;
  confidence?: number;
};

const SPEECH_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY;

const RECORDING_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY;

export class VoiceDetectionService {
  private static instance: VoiceDetectionService;
  private isListening = false;
  private listenTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners: Array<(event: VoiceDetectionEvent) => void> = [];

  private constructor() {}

  static getInstance(): VoiceDetectionService {
    if (!VoiceDetectionService.instance) {
      VoiceDetectionService.instance = new VoiceDetectionService();
    }
    return VoiceDetectionService.instance;
  }

  onDetection(callback: (event: VoiceDetectionEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  async startListening(): Promise<boolean> {
    if (this.isListening) return true;
    if (!SPEECH_API_KEY) {
      console.warn('Missing EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY. Voice detection disabled.');
      return false;
    }

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Microphone permission not granted.');
      return false;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    this.isListening = true;
    this.listenLoop();
    return true;
  }

  stopListening(): void {
    this.isListening = false;
    if (this.listenTimeout) {
      clearTimeout(this.listenTimeout);
      this.listenTimeout = null;
    }
  }

  private async listenLoop() {
    if (!this.isListening) return;

    try {
      const transcript = await this.recordAndTranscribe();
      if (transcript) {
        const lowered = transcript.toLowerCase();
        const keyword = VOICE_CONFIG.DISTRESS_KEYWORDS.find((k) =>
          lowered.includes(k.toLowerCase())
        );

        if (keyword) {
          this.emitDetection({ transcript, keyword });
        }
      }
    } catch (error) {
      console.error('Voice detection error:', error);
    }

    this.listenTimeout = setTimeout(
      () => this.listenLoop(),
      VOICE_CONFIG.LISTENING_INTERVAL
    );
  }

  private async recordAndTranscribe(): Promise<string | null> {
    const recording = new Audio.Recording();

    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await recording.startAsync();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await recording.stopAndUnloadAsync();

    const uri = recording.getURI();
    if (!uri) return null;

    const audioBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    return this.sendToSpeechApi(audioBase64);
  }

  private async sendToSpeechApi(audioContent: string): Promise<string | null> {
    if (!SPEECH_API_KEY) return null;

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${SPEECH_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'ENCODING_UNSPECIFIED',
            languageCode: 'en-IN',
            enableAutomaticPunctuation: true,
          },
          audio: {
            content: audioContent,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn('Speech API request failed:', await response.text());
      return null;
    }

    const data = await response.json();
    const transcript = data?.results?.[0]?.alternatives?.[0]?.transcript;
    return transcript || null;
  }

  private emitDetection(event: VoiceDetectionEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}

export default VoiceDetectionService.getInstance();
