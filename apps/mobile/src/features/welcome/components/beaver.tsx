import { BEAVER_SIZE } from "@boberstack/ui/beaver";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";

import { m } from "../../../paraglide/messages.js";
import { useBeaverMotion } from "../motion/use-beaver-motion.ts";
import { BEAVER_HEADROOM, BeaverArt } from "./beaver-art.tsx";

const ASPECT_RATIO = BEAVER_SIZE.width / (BEAVER_SIZE.height + BEAVER_HEADROOM);

export const Beaver = () => {
  const { pop, parts } = useBeaverMotion();

  const poke = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pop();
  };

  return (
    <Pressable
      onPress={poke}
      accessibilityRole="button"
      accessibilityLabel={m.welcome_beaver_label()}
      className="w-[220px]"
      style={{ aspectRatio: ASPECT_RATIO }}
      testID="welcome-beaver"
    >
      <BeaverArt motion={parts} />
    </Pressable>
  );
};
