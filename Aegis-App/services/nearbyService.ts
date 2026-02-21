// Nearby Service - Handles BLE Offline SOS via Google Nearby Connections API
// "Dumb Pipe" architecture: victim broadcasts, bystander relays to Firebase

import { BLE_CONFIG, STORAGE_KEYS } from '../utils/constants';
import type { BLESOSPayload, BLEMode } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Nearby Connections types (expo-nearby-connections)
// These will be imported from the actual library at runtime
let NearbyConnections: any = null;

// Try to import Nearby Connections (may not be available in all environments)
try {
    NearbyConnections = require('expo-nearby-connections');
} catch (e) {
    console.warn('expo-nearby-connections not available. BLE features disabled.');
}

type NearbyEventCallback = (data: any) => void;

export class NearbyService {
    private static instance: NearbyService;
    private mode: BLEMode = 'idle';
    private isAdvertising: boolean = false;
    private isDiscovering: boolean = false;
    private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    private onRelayedCallback: (() => void) | null = null;
    private onTimeoutCallback: (() => void) | null = null;
    private onSOSDetectedCallback: ((payload: BLESOSPayload) => void) | null = null;
    private connectedEndpoints: Set<string> = new Set();

    private constructor() { }

    static getInstance(): NearbyService {
        if (!NearbyService.instance) {
            NearbyService.instance = new NearbyService();
        }
        return NearbyService.instance;
    }

    /**
     * Check if Nearby Connections is available on this device
     */
    isAvailable(): boolean {
        return NearbyConnections !== null;
    }

    /**
     * Get current BLE mode
     */
    getMode(): BLEMode {
        return this.mode;
    }

    /**
     * Check if currently broadcasting or scanning
     */
    isActive(): boolean {
        return this.isAdvertising || this.isDiscovering;
    }

    // ═══════════════════════════════════════════
    // VICTIM MODE (Broadcaster / Advertiser)
    // ═══════════════════════════════════════════

    /**
     * Start broadcasting SOS as a victim (no internet scenario)
     * 
     * @param payload - SOS data: userId, lat, lng, timestamp
     * @param onRelayed - Called when a bystander picks up and relays the SOS
     * @param onTimeout - Called after BLE_CONFIG.TIMEOUT_MS with no relay
     */
    async startVictimBroadcast(
        payload: BLESOSPayload,
        onRelayed?: () => void,
        onTimeout?: () => void,
    ): Promise<boolean> {
        if (!this.isAvailable()) {
            console.error('Nearby Connections not available');
            return false;
        }

        try {
            this.mode = 'victim';
            this.onRelayedCallback = onRelayed || null;
            this.onTimeoutCallback = onTimeout || null;

            // Encode payload as pipe-delimited string: userId|lat|lng|timestamp
            const payloadString = this.encodePayload(payload);

            // Set up connection listener for when bystander connects
            this.setupVictimListeners(payloadString);

            // Start advertising — makes this phone discoverable to bystanders
            await NearbyConnections.startAdvertising(
                BLE_CONFIG.SERVICE_ID,
                BLE_CONFIG.ADVERTISE_NAME,
            );

            this.isAdvertising = true;
            console.log('🔴 Victim: Broadcasting SOS via Nearby Connections');
            console.log(`   Payload: ${payloadString}`);

            // Start timeout — if no bystander relays within TIMEOUT_MS → Alert Mode
            this.startTimeoutTimer();

            return true;
        } catch (error) {
            console.error('Error starting victim broadcast:', error);
            this.mode = 'idle';
            return false;
        }
    }

    /**
     * Stop victim broadcasting
     */
    async stopVictimBroadcast(): Promise<void> {
        try {
            if (this.isAdvertising && this.isAvailable()) {
                await NearbyConnections.stopAdvertising();
            }
        } catch (error) {
            console.error('Error stopping advertising:', error);
        } finally {
            this.isAdvertising = false;
            this.clearTimeoutTimer();
            this.removeAllListeners();
            if (this.mode === 'victim') {
                this.mode = 'idle';
            }
        }
    }

    /**
     * Set up event listeners for victim mode
     */
    private setupVictimListeners(payloadString: string): void {
        if (!NearbyConnections) return;

        // When a bystander requests connection
        NearbyConnections.onConnectionInitiated?.((event: any) => {
            console.log('📡 Victim: Bystander connection initiated:', event.endpointId);
            // Auto-accept all connections (we want anyone to relay our SOS)
            NearbyConnections.acceptConnection(event.endpointId);
        });

        // When connection is established
        NearbyConnections.onConnectionResult?.((event: any) => {
            if (event.status === 'CONNECTED' || event.isConnected) {
                console.log('✅ Victim: Bystander connected:', event.endpointId);
                this.connectedEndpoints.add(event.endpointId);

                // Send the SOS payload to the bystander
                NearbyConnections.sendPayload(event.endpointId, payloadString);
                console.log('📤 Victim: SOS payload sent to bystander');
            }
        });

        // When bystander disconnects (after receiving payload = relay happened)
        NearbyConnections.onDisconnected?.((event: any) => {
            console.log('📡 Victim: Bystander disconnected:', event.endpointId);
            this.connectedEndpoints.delete(event.endpointId);

            // Bystander received our SOS and disconnected → assume relay succeeded
            this.clearTimeoutTimer();
            this.onRelayedCallback?.();
        });
    }

    // ═══════════════════════════════════════════
    // BYSTANDER MODE (Scanner / Discoverer)
    // ═══════════════════════════════════════════

    /**
     * Start scanning as a bystander (has internet, looking for nearby SOSes)
     * 
     * @param onSOSDetected - Called when a victim's SOS signal is detected
     */
    async startBystanderScanning(
        onSOSDetected?: (payload: BLESOSPayload) => void,
    ): Promise<boolean> {
        if (!this.isAvailable()) {
            console.error('Nearby Connections not available');
            return false;
        }

        try {
            this.mode = 'bystander';
            this.onSOSDetectedCallback = onSOSDetected || null;

            // Set up discovery listeners
            this.setupBystanderListeners();

            // Start discovering — scan for nearby victims
            await NearbyConnections.startDiscovery(BLE_CONFIG.SERVICE_ID);

            this.isDiscovering = true;
            console.log('👁️ Bystander: Scanning for nearby SOS signals...');

            return true;
        } catch (error) {
            console.error('Error starting bystander scanning:', error);
            this.mode = 'idle';
            return false;
        }
    }

    /**
     * Stop bystander scanning
     */
    async stopBystanderScanning(): Promise<void> {
        try {
            if (this.isDiscovering && this.isAvailable()) {
                await NearbyConnections.stopDiscovery();
            }
        } catch (error) {
            console.error('Error stopping discovery:', error);
        } finally {
            this.isDiscovering = false;
            this.removeAllListeners();
            if (this.mode === 'bystander') {
                this.mode = 'idle';
            }
        }
    }

    /**
     * Set up event listeners for bystander mode
     */
    private setupBystanderListeners(): void {
        if (!NearbyConnections) return;

        // When a victim (advertiser) is discovered
        NearbyConnections.onEndpointFound?.((event: any) => {
            console.log('⚡ Bystander: SOS signal detected from:', event.endpointId);
            console.log('   Name:', event.endpointName);

            // Auto-connect to the victim
            NearbyConnections.requestConnection(
                BLE_CONFIG.SERVICE_ID,
                event.endpointId,
            );
        });

        // When connection is initiated
        NearbyConnections.onConnectionInitiated?.((event: any) => {
            console.log('📡 Bystander: Connection initiated with victim:', event.endpointId);
            NearbyConnections.acceptConnection(event.endpointId);
        });

        // When connection is established
        NearbyConnections.onConnectionResult?.((event: any) => {
            if (event.status === 'CONNECTED' || event.isConnected) {
                console.log('✅ Bystander: Connected to victim:', event.endpointId);
                this.connectedEndpoints.add(event.endpointId);
            }
        });

        // When payload is received from victim
        NearbyConnections.onPayloadReceived?.((event: any) => {
            console.log('📥 Bystander: SOS payload received');

            const payloadString = typeof event.payload === 'string'
                ? event.payload
                : new TextDecoder().decode(event.payload);

            const payload = this.decodePayload(payloadString);

            if (payload) {
                console.log('✅ Bystander: Decoded SOS payload:', payload);
                this.onSOSDetectedCallback?.(payload);
            } else {
                console.error('❌ Bystander: Failed to decode payload:', payloadString);
            }

            // Disconnect from victim after receiving
            if (event.endpointId) {
                NearbyConnections.disconnectFromEndpoint(event.endpointId);
            }
        });

        // When victim goes out of range
        NearbyConnections.onEndpointLost?.((event: any) => {
            console.log('📡 Bystander: Victim signal lost:', event.endpointId);
        });
    }

    // ═══════════════════════════════════════════
    // PAYLOAD ENCODING / DECODING
    // ═══════════════════════════════════════════

    /**
     * Encode BLESOSPayload to pipe-delimited string
     * Format: userId|lat|lng|timestamp
     * Example: "USR123|12.97|77.59|1708456789"
     */
    encodePayload(payload: BLESOSPayload): string {
        const d = BLE_CONFIG.PAYLOAD_DELIMITER;
        return [
            payload.userId,
            payload.latitude.toFixed(6),
            payload.longitude.toFixed(6),
            payload.timestamp.toString(),
        ].join(d);
    }

    /**
     * Decode pipe-delimited string to BLESOSPayload
     */
    decodePayload(payloadString: string): BLESOSPayload | null {
        try {
            const parts = payloadString.split(BLE_CONFIG.PAYLOAD_DELIMITER);
            if (parts.length < 4) return null;

            return {
                userId: parts[0],
                latitude: parseFloat(parts[1]),
                longitude: parseFloat(parts[2]),
                timestamp: parseInt(parts[3], 10),
            };
        } catch (error) {
            console.error('Error decoding BLE payload:', error);
            return null;
        }
    }

    // ═══════════════════════════════════════════
    // BYSTANDER MODE PERSISTENCE
    // ═══════════════════════════════════════════

    /**
     * Save bystander mode preference
     */
    async setBystanderModeEnabled(enabled: boolean): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.BYSTANDER_MODE, JSON.stringify(enabled));
        } catch (error) {
            console.error('Error saving bystander mode:', error);
        }
    }

    /**
     * Get bystander mode preference
     */
    async isBystanderModeEnabled(): Promise<boolean> {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEYS.BYSTANDER_MODE);
            return value ? JSON.parse(value) === true : false;
        } catch (error) {
            console.error('Error reading bystander mode:', error);
            return false;
        }
    }

    // ═══════════════════════════════════════════
    // TIMEOUT MANAGEMENT
    // ═══════════════════════════════════════════

    /**
     * Start the timeout timer — fires Alert Mode if no relay within TIMEOUT_MS
     */
    private startTimeoutTimer(): void {
        this.clearTimeoutTimer();
        this.timeoutTimer = setTimeout(() => {
            console.log('⏰ BLE timeout reached — no bystander relayed the SOS');
            this.onTimeoutCallback?.();
        }, BLE_CONFIG.TIMEOUT_MS);
    }

    /**
     * Clear the timeout timer (called when relay succeeds)
     */
    private clearTimeoutTimer(): void {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }
    }

    /**
     * Remove all Nearby event listeners
     */
    private removeAllListeners(): void {
        if (!NearbyConnections) return;

        // Disconnect from all endpoints
        this.connectedEndpoints.forEach((endpointId) => {
            try {
                NearbyConnections.disconnectFromEndpoint(endpointId);
            } catch (e) {
                // Ignore
            }
        });
        this.connectedEndpoints.clear();
    }

    /**
     * Full cleanup — call on app close or SOS resolve
     */
    async cleanup(): Promise<void> {
        await this.stopVictimBroadcast();
        await this.stopBystanderScanning();
        this.onRelayedCallback = null;
        this.onTimeoutCallback = null;
        this.onSOSDetectedCallback = null;
    }
}

export default NearbyService.getInstance();
