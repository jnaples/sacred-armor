import { AveriaSerifLibre_300Light } from "@expo-google-fonts/averia-serif-libre";
import { EBGaramond_600SemiBold_Italic } from "@expo-google-fonts/eb-garamond";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { useToastConfig } from "../components/ToastConfig";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { createSessionFromUrl, isAuthCallbackUrl } from "../lib/authLinks";
// import { Settings } from 'react-native-fbsdk-next';
// import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';


SplashScreen.preventAutoHideAsync();

function AppContent() {
  const toastConfig = useToastConfig();
  const router = useRouter();

  // Auth email links can land on any route (Supabase falls back to the Site URL,
  // sacredarmor://, when the redirect isn't allowed), so handle them here.
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !isAuthCallbackUrl(url)) return;
      try {
        const type = await createSessionFromUrl(url);
        if (type === "recovery" || url.includes("reset-password")) {
          router.replace("/reset-password");
        }
      } catch (error: any) {
        Alert.alert("Link invalid", error.message, [
          { text: "OK", onPress: () => router.replace("/auth") },
        ]);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [router]);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="reset-password" />
      </Stack>
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AveriaSerifLibre_300Light,
    EBGaramond_600SemiBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
  // const initFacebook = async () => {
  //   const { status } = await requestTrackingPermissionsAsync();
  //   Settings.initializeSDK();
  //   if (status === 'granted') {
  //     await Settings.setAdvertiserTrackingEnabled(true);
  //   }
  // };
  // initFacebook();
}, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
