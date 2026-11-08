import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Pressable, ScrollView, Text, View } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { API_ORIGIN } from "../../../shared/app-config.ts";
import { Beaver } from "./beaver.tsx";

const ACTION = "h-11 items-center justify-center rounded-[10px] px-[22px] active:opacity-60";

export const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp<{ SignIn: undefined }>>();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="items-center gap-8 px-6 pt-10 pb-10"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Beaver />
      <View className="items-center gap-[18px]">
        <Text className="text-center text-[40px] leading-[42px] font-black text-foreground">
          {m.welcome_title()}
          <Text className="text-brand">.</Text>
        </Text>
        <Text className="text-center text-lg leading-7 text-muted-foreground">
          {m.welcome_lead()}
        </Text>
      </View>
      <View className="w-full gap-3">
        <Pressable
          className={`${ACTION} bg-primary`}
          onPress={() => navigation.navigate("SignIn")}
          accessibilityRole="button"
          testID="welcome-sign-in"
        >
          <Text className="text-[15px] font-semibold text-primary-foreground">
            {m.welcome_open_example()}
          </Text>
        </Pressable>
        <Pressable
          className={`${ACTION} border-[1.5px] border-foreground`}
          onPress={() => void Linking.openURL(`${API_ORIGIN}/sign-up`)}
          accessibilityRole="link"
          testID="welcome-create-account"
        >
          <Text className="text-[15px] font-semibold text-foreground">
            {m.welcome_create_account()}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};
