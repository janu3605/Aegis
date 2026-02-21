// Nearby Service - Handles BLE Offline SOS via Google Nearby Connections API
// "Dumb Pipe" architecture: victim broadcasts, bystander relays to Firebase

import { Platform, PermissionsAndroid } from 'react-native';
import { BLE_CONFIG, STORAGE_KEYS } from '../utils/constants';
import type { BLESOSPayload, BLEMode } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Nearby Connections (expo-nearby-connections wrapper)
let NearbyConnections: any = null;

try {
    NearbyConnections = require('expo-nearby-connections');
} catch (e) {
    console.warn('expo-nearby-connections not available. BLE features disabled.');
}

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
    private listenerCleanups: Array<() => void> = [];

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

    /**
     * Request Bluetooth and location permissions required for Nearby Connections
     */
    private async requestBluetoothPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            const permissions: string[] = [
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ];

            // Android 12+ requires explicit Bluetooth permissions
            if (Platform.Version >= 31) {
                permissions.push(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                );
            }

            // Android 13+ requires NEARBY_WIFI_DEVICES for Nearby Connections
            if (Platform.Version >= 33) {
                permissions.push(
                    'android.permission.NEARBY_WIFI_DEVICES' as any,
                );
            }

            const results = await PermissionsAndroid.requestMultiple(permissions as any);

            // Log all permission results for debugging
            console.log('BLE permission results:', JSON.stringify(results));

            // Check that all critical permissions are granted
            const locationGranted = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
            if (!locationGranted) {
                console.warn('Location permission denied — Nearby Connections requires it');
                return false;
            }

            // On Android 12+, check BLE permissions
            if (Platform.Version >= 31) {
                const scanGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
                const connectGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
                const advertiseGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE] === PermissionsAndroid.RESULTS.GRANTED;

                if (!scanGranted) console.warn('BLUETOOTH_SCAN denied');
                if (!connectGranted) console.warn('BLUETOOTH_CONNECT denied');
                if (!advertiseGranted) console.warn('BLUETOOTH_ADVERTISE denied');

                if (!scanGranted || !connectGranted || !advertiseGranted) {
                    console.warn('Bluetooth permissions denied — Nearby Connections requires them on Android 12+');
                    return false;
                }
            }

            // On Android 13+, check NEARBY_WIFI_DEVICES
            if (Platform.Version >= 33) {
                const nearbyWifiGranted =
                    results['android.permission.NEARBY_WIFI_DEVICES' as any] === PermissionsAndroid.RESULTS.GRANTED;
                if (!nearbyWifiGranted) {
                    console.warn('NEARBY_WIFI_DEVICES permission denied — required on Android 13+ for Nearby Connections');
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Error requesting Bluetooth permissions:', error);
            return false;
        }
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

        if (this.mode !== 'idle') {
            console.warn(`Cannot start victim mode — already in ${this.mode} mode`);
            return false;
        }

        try {
            // Request permissions before any BLE operation
            const hasPermissions = await this.requestBluetoothPermissions();
            if (!hasPermissions) {
                console.error('Bluetooth permissions not granted');
                return false;
            }

            this.mode = 'victim';
            this.onRelayedCallback = onRelayed || null;
            this.onTimeoutCallback = onTimeout || null;

            // Encode payload as pipe-delimited string: userId|lat|lng|timestamp
            const payloadString = this.encodePayload(payload);

            // Set up connection listeners for when bystander connects
            this.setupVictimListeners(payloadString);

            // Start advertising — makes this phone discoverable to bystanders
            await NearbyConnections.startAdvertise(BLE_CONFIG.ADVERTISE_NAME);

            this.isAdvertising = true;
            console.log('Victim: Broadcasting SOS via Nearby Connections');
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
                await NearbyConnections.stopAdvertise();
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

        // Clean up any existing listeners first
        this.removeAllListeners();

        // When a bystander requests connection
        const unsubInvitation = NearbyConnections.onInvitationReceived?.((event: any) => {
            console.log('Victim: Bystander connection initiated:', event.peerId);
            // Auto-accept all connections (we want anyone to relay our SOS)
            try {
                NearbyConnections.acceptConnection(event.peerId);
            } catch (e) {
                console.error('Victim: Failed to accept connection:', e);
            }
        });
        if (unsubInvitation) this.listenerCleanups.push(unsubInvitation);

        // When connection is established
        const unsubConnected = NearbyConnections.onConnected?.((event: any) => {
            console.log('Victim: Bystander connected:', event.peerId);
            this.connectedEndpoints.add(event.peerId);

            // Send the SOS payload to the bystander
            try {
                NearbyConnections.sendText(event.peerId, payloadString);
                console.log('Victim: SOS payload sent to bystander');
            } catch (e) {
                console.error('Victim: Failed to send payload:', e);
            }
        });
        if (unsubConnected) this.listenerCleanups.push(unsubConnected);

        // When bystander disconnects (after receiving payload = relay happened)
        const unsubDisconnected = NearbyConnections.onDisconnected?.((event: any) => {
            console.log('Victim: Bystander disconnected:', event.peerId);
            this.connectedEndpoints.delete(event.peerId);

            // Bystander received our SOS and disconnected → assume relay succeeded
            this.clearTimeoutTimer();
            this.onRelayedCallback?.();
        });
        if (unsubDisconnected) this.listenerCleanups.push(unsubDisconnected);
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

        if (this.mode !== 'idle') {
            console.warn(`Cannot start bystander mode — already in ${this.mode} mode`);
            return false;
        }

        try {
            // Request permissions before any BLE operation
            const hasPermissions = await this.requestBluetoothPermissions();
            if (!hasPermissions) {
                console.error('Bluetooth permissions not granted');
                return false;
            }

            this.mode = 'bystander';
            this.onSOSDetectedCallback = onSOSDetected || null;

            // Set up discovery listeners
            this.setupBystanderListeners();

            // Start discovering — scan for nearby victims
            await NearbyConnections.startDiscovery(BLE_CONFIG.ADVERTISE_NAME);

            this.isDiscovering = true;
            console.log('Bystander: Scanning for nearby SOS signals...');

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

        // Clean up any existing listeners first
        this.removeAllListeners();

        // When a victim (advertiser) is discovered
        const unsubPeerFound = NearbyConnections.onPeerFound?.((event: any) => {
            console.log('Bystander: SOS signal detected from:', event.peerId);
            console.log('   Name:', event.name);

            // Auto-connect to the victim
            try {
                NearbyConnections.requestConnection(event.peerId);
            } catch (e) {
                console.error('Bystander: Failed to request connection:', e);
            }
        });
        if (unsubPeerFound) this.listenerCleanups.push(unsubPeerFound);

        // When connection invitation is received from victim
        const unsubInvitation = NearbyConnections.onInvitationReceived?.((event: any) => {
            console.log('Bystander: Connection initiated with victim:', event.peerId);
            try {
                NearbyConnections.acceptConnection(event.peerId);
            } catch (e) {
                console.error('Bystander: Failed to accept connection:', e);
            }
        });
        if (unsubInvitation) this.listenerCleanups.push(unsubInvitation);

        // When connection is established
        const unsubConnected = NearbyConnections.onConnected?.((event: any) => {
            console.log('Bystander: Connected to victim:', event.peerId);
            this.connectedEndpoints.add(event.peerId);
        });
        if (unsubConnected) this.listenerCleanups.push(unsubConnected);

        // When text payload is received from victim
        const unsubTextReceived = NearbyConnections.onTextReceived?.((event: any) => {
            console.log('Bystander: SOS payload received');

            const payloadString = event.text;
            const payload = this.decodePayload(payloadString);

            if (payload) {
                console.log('Bystander: Decoded SOS payload:', payload);
                this.onSOSDetectedCallback?.(payload);
            } else {
                console.error('Bystander: Failed to decode payload:', payloadString);
            }

            // Disconnect from victim after receiving
            if (event.peerId) {
                try {
                    NearbyConnections.disconnect(event.peerId);
                } catch (e) {
                    console.error('Bystander: Failed to disconnect:', e);
                }
            }
        });
        if (unsubTextReceived) this.listenerCleanups.push(unsubTextReceived);

        // When victim goes out of range
        const unsubPeerLost = NearbyConnections.onPeerLost?.((event: any) => {
            console.log('Bystander: Victim signal lost:', event.peerId);
        });
        if (unsubPeerLost) this.listenerCleanups.push(unsubPeerLost);
    }

    // ═══════════════════════════════════════════
    // PAYLOAD ENCODING / DECODING
    // ═══════════════════════════════════════════

    /**
     * Encode BLESOSPayload to pipe-delimited string
     * Format: userId|lat|lng|timestamp
     * Example: "USR123|12.970000|77.590000|1708456789"
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
     * Returns null for invalid or malformed payloads
     */
    decodePayload(payloadString: string): BLESOSPayload | null {
        try {
            const parts = payloadString.split(BLE_CONFIG.PAYLOAD_DELIMITER);
            if (parts.length < 4) return null;

            const userId = parts[0];
            const latitude = parseFloat(parts[1]);
            const longitude = parseFloat(parts[2]);
            const timestamp = parseInt(parts[3], 10);

            // Validate decoded values
            if (!userId || userId.trim() === '') return null;
            if (isNaN(latitude) || latitude < -90 || latitude > 90) return null;
            if (isNaN(longitude) || longitude < -180 || longitude > 180) return null;
            if (isNaN(timestamp) || timestamp <= 0) return null;

            return { userId, latitude, longitude, timestamp };
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
        this.timeoutTimer = setTimeout(async () => {
            console.log('BLE timeout reached — no bystander relayed the SOS');
            // Stop advertising to save battery
            try {
                if (this.isAdvertising) {
                    await NearbyConnections?.stopAdvertise();
                    this.isAdvertising = false;
                }
            } catch (e) {
                console.error('Error stopping advertise on timeout:', e);
            }
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
     * Remove all Nearby event listeners and disconnect endpoints
     */
    private removeAllListeners(): void {
        // Call all stored unsubscribe functions
        for (const unsub of this.listenerCleanups) {
            try { unsub(); } catch (e) { /* ignore */ }
        }
        this.listenerCleanups = [];

        // Disconnect from all endpoints
        if (NearbyConnections) {
            this.connectedEndpoints.forEach((peerId) => {
                try {
                    NearbyConnections.disconnect(peerId);
                } catch (e) {
                    // Ignore — endpoint may already be disconnected
                }
            });
        }
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
