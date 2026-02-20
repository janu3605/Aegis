// Fake Call Screen - Realistic incoming call UI

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    SafeAreaView,
    Animated,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import FakeCallService from '@/services/fakeCallService';
import { Colors } from '@/utils/constants';
import type { FakeCallConfig } from '@/services/fakeCallService';

const { height: screenHeight } = Dimensions.get('window');

export default function FakeCallScreen() {
    const params = useLocalSearchParams();
    const [callDuration, setCallDuration] = useState(0);
    const [isCallActive, setIsCallActive] = useState(false);
    const [pulseAnim] = useState(new Animated.Value(1));
    const [callerName, setCallerName] = useState('Unknown Caller');

    useEffect(() => {
        // Extract caller info from params
        if (params.callerName) {
            setCallerName(Array.isArray(params.callerName) ? params.callerName[0] : params.callerName);
        }

        // Animate pulse effect on answer button
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        return () => {
            // Cleanup on unmount
        };
    }, [params, pulseAnim]);

    // Track call duration
    useEffect(() => {
        if (!isCallActive) return;

        const timer = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isCallActive]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerCall = async () => {
        setIsCallActive(true);

        // Create caller config for the service
        const callerConfig: FakeCallConfig = {
            callerName,
            ringtoneType: 'default',
        };

        try {
            await FakeCallService.answerCall();

            // Auto-disconnect after 30 seconds or show call UI
            const callDuration = 30000; // 30 seconds
            setTimeout(() => {
                handleEndCall();
            }, callDuration);
        } catch (error) {
            console.error('Error answering call:', error);
            setIsCallActive(false);
        }
    };

    const handleDeclineCall = async () => {
        try {
            await FakeCallService.declineCall();
            router.back();
        } catch (error) {
            console.error('Error declining call:', error);
            router.back();
        }
    };

    const handleEndCall = async () => {
        try {
            await FakeCallService.endCall();
            setIsCallActive(false);
            setCallDuration(0);
            router.back();
        } catch (error) {
            console.error('Error ending call:', error);
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <ImageBackground
                source={require('@/assets/images/fake_call.jpg')}
                style={styles.backgroundImage}
                blurRadius={3}
            >
                {/* Overlay for better text visibility */}
                <View style={styles.overlay} />

                {/* Caller Info */}
                <View style={styles.callerContainer}>
                    <Text style={styles.callerName}>{callerName}</Text>
                    <Text style={styles.callStatus}>
                        {isCallActive ? `In Call • ${formatDuration(callDuration)}` : 'Incoming Call...'}
                    </Text>
                </View>

                {/* Call Controls */}
                {!isCallActive ? (
                    <View style={styles.controlsContainer}>
                        {/* Decline Button */}
                        <TouchableOpacity
                            style={styles.declineButton}
                            onPress={handleDeclineCall}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>✕</Text>
                        </TouchableOpacity>

                        {/* Answer Button with Pulse Effect */}
                        <Animated.View
                            style={[
                                styles.answerButtonContainer,
                                {
                                    transform: [{ scale: pulseAnim }],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.answerButton}
                                onPress={handleAnswerCall}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.buttonText}>☎</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                ) : (
                    /* In-Call Controls */
                    <View style={styles.inCallContainer}>

                        {/* End Call Button */}
                        <TouchableOpacity
                            style={styles.endCallButton}
                            onPress={handleEndCall}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.endCallButtonText}>End Call</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ImageBackground>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundDark,
    },
    backgroundImage: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 80,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    callerContainer: {
        alignItems: 'center',
        marginTop: screenHeight * 0.15,
    },
    callerName: {
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.textDark,
        marginBottom: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    callStatus: {
        fontSize: 16,
        color: Colors.background,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    declineButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: Colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    answerButtonContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    answerButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    buttonText: {
        fontSize: 40,
        color: Colors.surface,
        fontWeight: 'bold',
    },
    inCallContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        gap: 20,
    },
    inCallButton: {
        width: '22%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingVertical: 15,
        marginBottom: 10,
    },
    inCallButtonText: {
        fontSize: 28,
        marginBottom: 6,
    },
    inCallButtonLabel: {
        fontSize: 11,
        color: Colors.surface,
        fontWeight: '600',
    },
    endCallButton: {
        width: '90%',
        paddingVertical: 16,
        backgroundColor: Colors.danger,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        elevation: 8,
        shadowColor: Colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    endCallButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.surface,
    },
});
