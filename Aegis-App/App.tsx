import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Note: App.tsx is overridden by Expo Router which uses app/ folder
// This entry point is maintained for compatibility but not actively used
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#E63946" translucent={false} />
    </SafeAreaProvider>
  );
}
