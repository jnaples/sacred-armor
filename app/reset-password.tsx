import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // The root layout turns the email link into a session before routing here.
  const { session } = useAuth();

  const handleResetPassword = async () => {
    if (!session) {
      Alert.alert(
        "Error",
        "Please open the reset link from your email on this device."
      );
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert("Success", "Your password has been reset", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/bg-dark.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your new password</Text>

      <TextInput
        style={styles.input}
        placeholder="New Password"
        placeholderTextColor="#656464"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Resetting..." : "Reset Password"}
        </Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}

// Matches the dark palette used on the auth screen.
const colors = {
  background: "#191F2F",
  cardBackground: "#1D2230",
  cardBorder: "#443A37",
  text: "#E8E6E3",
  accent: "#DE9D36",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 40,
    textAlign: "center",
    marginBottom: 8,
    color: colors.text,
    fontFamily: "AveriaSerifLibre_300Light",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.cardBackground,
    padding: 15,
    borderRadius: 12,
    marginBottom: 24,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    fontFamily: "Inter_400Regular",
  },
  button: {
    backgroundColor: colors.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
