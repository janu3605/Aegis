// Fake Call Service - Realistic distraction call feature for emergency situations

import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import StorageService from './storageService';

export interface FakeCallConfig {
    callerName: string;
    callerImage?: string;
    duration?: number; // in seconds
    ringtoneType?: 'default' | 'classic' | 'modern';
}

export interface ScheduledCall {
    id: string;
    scheduledTime: Date;
    config: FakeCallConfig;
    notificationId?: string;
}

class FakeCallService {
    private static instance: FakeCallService;
    private isRinging: boolean = false;
    private currentSound: Audio.Sound | null = null;
    private callDuration: number = 30; // default 30 seconds
    private callTimer: ReturnType<typeof setTimeout> | null = null;
    private ringtoneDuration: number = 30000; // 30 seconds for ringtone
    private ringtoneTimer: ReturnType<typeof setTimeout> | null = null;
    private scheduledCalls: Map<string, ScheduledCall> = new Map();
    private callCallbacks: {
        onCallEnded?: () => void;
        onCallAnswered?: () => void;
        onCallDeclined?: () => void;
    } = {};

    private constructor() {
        this.setupAudio();
        this.loadScheduledCalls();
    }

    static getInstance(): FakeCallService {
        if (!FakeCallService.instance) {
            FakeCallService.instance = new FakeCallService();
        }
        return FakeCallService.instance;
    }

    /**
     * Setup audio session for call simulation
     */
    private async setupAudio(): Promise<void> {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                interruptionModeIOS: 1,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
            });
        } catch (error) {
            console.error('Error setting up audio:', error);
        }
    }

    /**
     * Simulate fake incoming call with UI
     * @param config - Caller configuration
     * @param onAnswered - Callback when call is "answered"
     * @param onDeclined - Callback when call is "declined"
     */
    async initiateCall(
        config: FakeCallConfig,
        callbacks?: {
            onCallAnswered?: () => void;
            onCallDeclined?: () => void;
            onCallEnded?: () => void;
        }
    ): Promise<void> {
        if (this.isRinging) {
            console.warn('A call is already in progress');
            return;
        }

        this.isRinging = true;
        this.callCallbacks = callbacks || {};

        try {
            // Play ringtone
            await this.playRingtone(config.ringtoneType || 'default');

            // Send notification for incoming call
            await this.sendIncomingCallNotification(config);

            // Start call timer - user has 30 seconds to interact
            this.startRingtoneDuration();
        } catch (error) {
            console.error('Error initiating fake call:', error);
            this.isRinging = false;
        }
    }

    /**
     * Simulate answering the call
     */
    async answerCall(): Promise<void> {
        if (!this.isRinging) return;

        try {
            // Stop ringtone
            await this.stopRingtone();

            // Delay audio play by 3 seconds
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Play background conversation audio (simulated)
            await this.playCallAudio();

            // Clear ringtone timer
            if (this.ringtoneTimer) {
                clearTimeout(this.ringtoneTimer);
                this.ringtoneTimer = null;
            }

            // Execute callback
            if (this.callCallbacks.onCallAnswered) {
                this.callCallbacks.onCallAnswered();
            }

            // Auto-end call after specified duration
            const duration = this.callDuration * 1000;
            this.callTimer = setTimeout(() => {
                this.endCall();
            }, duration);
        } catch (error) {
            console.error('Error answering call:', error);
        }
    }

    /**
     * Simulate declining the call
     */
    async declineCall(): Promise<void> {
        if (!this.isRinging) return;

        try {
            await this.stopRingtone();

            if (this.ringtoneTimer) {
                clearTimeout(this.ringtoneTimer);
                this.ringtoneTimer = null;
            }

            this.isRinging = false;

            if (this.callCallbacks.onCallDeclined) {
                this.callCallbacks.onCallDeclined();
            }
        } catch (error) {
            console.error('Error declining call:', error);
        }
    }

    /**
     * End the current call
     */
    async endCall(): Promise<void> {
        try {
            await this.stopCallAudio();
            await this.stopRingtone();

            if (this.callTimer) {
                clearTimeout(this.callTimer);
                this.callTimer = null;
            }

            if (this.ringtoneTimer) {
                clearTimeout(this.ringtoneTimer);
                this.ringtoneTimer = null;
            }

            this.isRinging = false;

            if (this.callCallbacks.onCallEnded) {
                this.callCallbacks.onCallEnded();
            }
        } catch (error) {
            console.error('Error ending call:', error);
        }
    }

    /**
     * Play realistic ringtone
     */
    private async playRingtone(type: 'default' | 'classic' | 'modern'): Promise<void> {
        try {
            const sound = new Audio.Sound();

            // Load ringtone audio file
            const ringtoneFile = require('../assets/Audio/PoliceAlert1.wav');
            await sound.loadAsync(ringtoneFile);
            await sound.playAsync();

            console.log(`Playing ringtone: PoliceAlert1.wav`);
            this.currentSound = sound;
        } catch (error) {
            console.error('Error playing ringtone:', error);
        }
    }

    /**
     * Stop ringtone
     */
    private async stopRingtone(): Promise<void> {
        try {
            if (this.currentSound) {
                await this.currentSound.stopAsync();
                await this.currentSound.unloadAsync();
                this.currentSound = null;
            }
        } catch (error) {
            console.error('Error stopping ringtone:', error);
        }
    }

    /**
     * Play background conversation audio (simulated)
     */
    private async playCallAudio(): Promise<void> {
        try {
            const sound = new Audio.Sound();

            // Load call audio file
            const callAudioFile = require('../assets/Audio/PoliceAlert2.mp3');
            await sound.loadAsync(callAudioFile);
            await sound.playAsync();

            console.log('Playing background call audio: PoliceAlert2.mp3');
            this.currentSound = sound;
        } catch (error) {
            console.error('Error playing call audio:', error);
        }
    }

    /**
     * Stop call audio
     */
    private async stopCallAudio(): Promise<void> {
        try {
            if (this.currentSound) {
                await this.currentSound.stopAsync();
                await this.currentSound.unloadAsync();
                this.currentSound = null;
            }
        } catch (error) {
            console.error('Error stopping call audio:', error);
        }
    }

    /**
     * Start ringtone duration timer (30 seconds to answer/decline)
     */
    private startRingtoneDuration(): void {
        this.ringtoneTimer = setTimeout(() => {
            if (this.isRinging) {
                this.declineCall();
            }
        }, this.ringtoneDuration);
    }

    /**
     * Schedule a fake call for later
     */
    async scheduleCall(
        delayMinutes: number,
        config: FakeCallConfig
    ): Promise<string> {
        const callId = `call_${Date.now()}`;
        const scheduledTime = new Date(Date.now() + delayMinutes * 60 * 1000);

        const scheduledCall: ScheduledCall = {
            id: callId,
            scheduledTime,
            config,
        };

        try {
            // Schedule notification
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: `Scheduled Call from ${config.callerName}`,
                    body: `Your distraction call is ready`,
                    sound: 'default',
                    badge: 1,
                },
                trigger: {
                    seconds: delayMinutes * 60,
                    type: 1 as any, // TIME_INTERVAL
                },
            });

            scheduledCall.notificationId = notificationId;
            this.scheduledCalls.set(callId, scheduledCall);

            // Save to storage
            await this.saveScheduledCalls();

            return callId;
        } catch (error) {
            console.error('Error scheduling call:', error);
            throw error;
        }
    }

    /**
     * Cancel a scheduled call
     */
    async cancelScheduledCall(callId: string): Promise<void> {
        const scheduledCall = this.scheduledCalls.get(callId);
        if (!scheduledCall) return;

        try {
            if (scheduledCall.notificationId) {
                await Notifications.cancelScheduledNotificationAsync(
                    scheduledCall.notificationId
                );
            }

            this.scheduledCalls.delete(callId);
            await this.saveScheduledCalls();
        } catch (error) {
            console.error('Error canceling scheduled call:', error);
        }
    }

    /**
     * Get all scheduled calls
     */
    getScheduledCalls(): ScheduledCall[] {
        return Array.from(this.scheduledCalls.values());
    }

    /**
     * Get popular caller presets
     */
    static getPopularCallers(): FakeCallConfig[] {
        return [
            { callerName: 'Mom', callerImage: 'M', ringtoneType: 'default' },
            { callerName: 'Dad', callerImage: 'D', ringtoneType: 'default' },
            { callerName: 'Best Friend', callerImage: 'BF', ringtoneType: 'modern' },
            { callerName: 'Work', callerImage: 'W', ringtoneType: 'classic' },
            { callerName: 'Important Call', callerImage: 'IC', ringtoneType: 'default' },
        ];
    }

    /**
     * Check if a call is currently active
     */
    isCallActive(): boolean {
        return this.isRinging;
    }

    /**
     * Set custom call duration
     */
    setCallDuration(seconds: number): void {
        this.callDuration = seconds;
    }

    /**
     * Save scheduled calls to storage
     */
    private async saveScheduledCalls(): Promise<void> {
        try {
            const calls = Array.from(this.scheduledCalls.values());
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('scheduledCalls', JSON.stringify(calls));
        } catch (error) {
            console.error('Error saving scheduled calls:', error);
        }
    }

    /**
     * Load scheduled calls from storage
     */
    private async loadScheduledCalls(): Promise<void> {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const data = await AsyncStorage.getItem('scheduledCalls');
            if (data) {
                const calls: ScheduledCall[] = JSON.parse(data);
                calls.forEach((call) => {
                    // Only load future scheduled calls
                    if (new Date(call.scheduledTime) > new Date()) {
                        this.scheduledCalls.set(call.id, call);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading scheduled calls:', error);
        }
    }

    /**
     * Send incoming call notification
     */
    private async sendIncomingCallNotification(config: FakeCallConfig): Promise<void> {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `Incoming Call`,
                    body: `${config.callerName} is calling...`,
                    sound: 'default',
                    badge: 1,
                },
                trigger: null,
            });
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }
}

export default FakeCallService.getInstance();
