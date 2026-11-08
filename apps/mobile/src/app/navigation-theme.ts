import { DefaultTheme } from "@react-navigation/native";
import type { Theme } from "@react-navigation/native";
import { Predicate } from "effect";
import { useCSSVariable } from "uniwind";

const colorOr = (value: string | number | undefined, fallback: string) =>
  Predicate.isString(value) ? value : fallback;

export const useNavigationTheme = (): Theme => {
  const [background, foreground, border, primary] = useCSSVariable([
    "--background",
    "--foreground",
    "--border",
    "--primary",
  ]);

  const { colors } = DefaultTheme;

  return {
    ...DefaultTheme,
    colors: {
      ...colors,
      background: colorOr(background, colors.background),
      card: colorOr(background, colors.card),
      text: colorOr(foreground, colors.text),
      border: colorOr(border, colors.border),
      primary: colorOr(primary, colors.primary),
    },
  };
};
