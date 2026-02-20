import { requireNativeModule } from 'expo-modules-core';

let ExpoSosModule: any = null;

try {
  ExpoSosModule = requireNativeModule('ExpoSosModule');
} catch (e) {
  console.warn('ExpoSosModule not available — native SMS will fall back to Linking API.', e);
}

export function isNativeModuleAvailable(): boolean {
  return ExpoSosModule !== null;
}

export function sendSMS(phoneNumbers: string[], message: string): Promise<boolean> {
  if (!ExpoSosModule) {
    return Promise.reject(new Error('ExpoSosModule not available'));
  }
  return ExpoSosModule.sendSMS(phoneNumbers, message);
}
