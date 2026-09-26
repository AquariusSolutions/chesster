import { persistor, store } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { TermsGate } from "@/components/terms-gate";
import { useResolvedScheme } from "@/hooks/use-resolved-scheme";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

SplashScreen.preventAutoHideAsync();

// Web: when this page loads inside the Google sign-in popup, pass the result
// back to the opener window and close. No-op on native.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemedApp />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const scheme = useResolvedScheme();
  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <BottomSheetModalProvider>
        <RootNavigator />
      </BottomSheetModalProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const initializing = useAppSelector((s) => s.auth.initializing);

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync();
  }, [initializing]);

  // Hold the splash until Firebase reports the current auth state.
  if (initializing) return null;

  // The board (app) is always home; sign in / sign up is an optional modal
  // reached from the drawer. Guests are signed in anonymously in the background.
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="terms"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Terms & Conditions",
          }}
        />
      </Stack>
      {/* Blocking overlay until the current Terms version is accepted. */}
      <TermsGate />
    </>
  );
}
