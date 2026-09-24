import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";
import BackgroundWrapper from "../../components/BackgroundWrapper";
import VerseCard from "../../components/VerseCard";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabase";

type Verse = {
  id: string;
  reference: string;
  verse: string;
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [verseHistory, setVerseHistory] = useState<Verse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savedVerseIds, setSavedVerseIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"swipe" | "list">("swipe");
  const { isGuest } = useAuth();
  const router = useRouter();

  const translateX = useSharedValue(0);

  useEffect(() => {
    fetchAllVerses();
  }, []);

  useEffect(() => {
    if (verseHistory.length > 0) {
      checkIfSaved();
    }
  }, [currentIndex, verseHistory]);

  useFocusEffect(
    React.useCallback(() => {
      if (verseHistory.length > 0) checkIfSaved();
      fetchSavedVerseIds();
    }, [currentIndex, verseHistory]),
  );

  const fetchSavedVerseIds = async () => {
    if (isGuest) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("saved_verses")
        .select("verse_id")
        .eq("user_id", user.id);
      if (data) setSavedVerseIds(new Set(data.map((r) => r.verse_id)));
    } catch {}
  };

  const handleListSave = async (verse: Verse) => {
    if (isGuest) { router.replace("/auth"); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const alreadySaved = savedVerseIds.has(verse.id);
      if (alreadySaved) {
        await supabase.from("saved_verses").delete().eq("user_id", user.id).eq("verse_id", verse.id);
        setSavedVerseIds((prev) => { const next = new Set(prev); next.delete(verse.id); return next; });
        Toast.show({ type: "success", text1: "Verse removed from saved", position: "top", topOffset: 64 });
      } else {
        await supabase.from("saved_verses").insert({ user_id: user.id, verse_id: verse.id });
        setSavedVerseIds((prev) => new Set(prev).add(verse.id));
        Toast.show({ type: "success", text1: "Verse saved to collection", position: "top", topOffset: 64 });
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Error", text2: error.message, position: "top", topOffset: 64 });
    }
  };

  const fetchAllVerses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("verses").select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setVerses(shuffled);
        setVerseHistory([shuffled[0]]);
      }
    } catch (error) {
      console.error("Error fetching verses:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async () => {
    try {
      const currentVerse = verseHistory[currentIndex];
      if (!currentVerse) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("saved_verses")
        .select("id")
        .eq("user_id", user.id)
        .eq("verse_id", currentVerse.id)
        .single();

      setIsSaved(!!data);
    } catch {
      setIsSaved(false);
    }
  };

  const handleSave = async () => {
    if (isGuest) {
      router.replace("/auth");
      return;
    }

    try {
      const currentVerse = verseHistory[currentIndex];
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (isSaved) {
        await supabase
          .from("saved_verses")
          .delete()
          .eq("user_id", user.id)
          .eq("verse_id", currentVerse.id);

        setIsSaved(false);
        Toast.show({
          type: "success",
          text1: "Verse removed from saved",
          position: "top",
          topOffset: 64,
        });
      } else {
        await supabase
          .from("saved_verses")
          .insert({ user_id: user.id, verse_id: currentVerse.id });

        setIsSaved(true);
        Toast.show({
          type: "success",
          text1: "Verse saved to collection",
          position: "top",
          topOffset: 64,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
        position: "top",
        topOffset: 64,
      });
    }
  };

  const getNextVerse = () => {
    if (verses.length === 0) return;

    const nextIndex = verseHistory.length;

    if (nextIndex >= verses.length) {
      const reshuffled = [...verses].sort(() => Math.random() - 0.5);
      setVerses(reshuffled);
      setVerseHistory([reshuffled[0]]);
      setCurrentIndex(0);
    } else {
      setVerseHistory([...verseHistory, verses[nextIndex]]);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const getPreviousVerse = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -100) {
        translateX.value = withSpring(0);
        getNextVerse();
      } else if (event.translationX > 100 && currentIndex > 0) {
        translateX.value = withSpring(0);
        getPreviousVerse();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (loading) {
    return (
      <BackgroundWrapper style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </BackgroundWrapper>
    );
  }

  if (verseHistory.length === 0) {
    return (
      <BackgroundWrapper style={styles.container}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          No verses found. Add some in Supabase!
        </Text>
      </BackgroundWrapper>
    );
  }

  const currentVerse = verseHistory[currentIndex];

  const header = (
    <View style={styles.header}>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          onPress={() => setViewMode("swipe")}
          style={styles.toggleBtn}
        >
          <Ionicons
            name="albums"
            size={28}
            color={viewMode === "swipe" ? colors.tabBarActive : colors.tabBarInactive}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode("list")}
          style={styles.toggleBtn}
        >
          <Ionicons
            name="list-circle"
            size={28}
            color={viewMode === "list" ? colors.tabBarActive : colors.tabBarInactive}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (viewMode === "list") {
    return (
      <BackgroundWrapper style={styles.screen}>
        {header}
        <FlatList
          data={verses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={[styles.listItem, { borderBottomColor: colors.cardBorder }]}>
              <TouchableOpacity style={styles.listBookmark} onPress={() => handleListSave(item)}>
                <Ionicons
                  name={savedVerseIds.has(item.id) ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>
              <Text style={[styles.listVerseText, { color: colors.text }]}>
                {item.verse}
              </Text>
              <Text style={[styles.listReference, { color: colors.reference }]}>
                — {item.reference}
              </Text>
            </View>
          )}
        />
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper style={styles.screen}>
      {header}
      <View style={styles.swipeContent}>
        <GestureDetector gesture={panGesture}>
          <VerseCard verse={currentVerse} isSaved={isSaved} onSave={handleSave} animatedStyle={animatedStyle} />
        </GestureDetector>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 70,
  },
  swipeContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  listScreen: {
    flex: 1,
    paddingTop: 70,
  },
  controls: {
    position: "absolute",
    top: 64,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  toggleGroup: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
  },
  toggleBtn: {
    padding: 10,
    borderRadius: 8,
  },
  listContainer: {
    padding: 20,
    paddingTop: 6,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  listItem: {
    marginBottom: 24,
    borderBottomWidth: 1,
    paddingBottom: 24,
  },
  listVerseText: {
    fontSize: 20,
    marginBottom: 12,
    lineHeight: 26,
    fontFamily: "AveriaSerifLibre_300Light",
    letterSpacing: -0.5,
  },
  listReference: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "EBGaramond_600SemiBold_Italic",
  },
  listBookmark: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
  },
});
