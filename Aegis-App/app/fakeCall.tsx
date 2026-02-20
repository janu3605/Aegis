import React from 'react';
import { SafeAreaView, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function FakeCallScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={require('@/assets/images/fake_call.jpg')}
        style={styles.image}
        resizeMode="cover"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
