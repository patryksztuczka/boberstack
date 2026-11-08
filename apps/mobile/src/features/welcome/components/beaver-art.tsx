import { BEAVER_ART, BEAVER_SIZE } from "@boberstack/ui/beaver";
import type { BeaverAttributes, BeaverNode, BeaverPart } from "@boberstack/ui/beaver";
import { useId } from "react";
import type { ReactNode } from "react";
import Animated from "react-native-reanimated";
import type { AnimatedProps } from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from "react-native-svg";

import type { Matrix } from "../motion/matrix.ts";

export const BEAVER_HEADROOM = 160;

const VIEW_BOX = [0, -BEAVER_HEADROOM, BEAVER_SIZE.width, BEAVER_SIZE.height + BEAVER_HEADROOM]
  .map(String)
  .join(" ");

const AnimatedGroup = Animated.createAnimatedComponent(G<{ matrix?: Matrix }>);

export type PartMotion = Partial<
  Record<BeaverPart, Partial<AnimatedProps<{ matrix?: Matrix }>>["animatedProps"]>
>;

interface SvgAttributes extends Omit<BeaverAttributes, "part" | "id" | "clipPath"> {
  id?: string;
  clipPath?: string;
}

const svgAttributes = (
  { part: _part, id, clipPath, ...drawing }: BeaverAttributes,
  uid: string,
): SvgAttributes => {
  const attributes: SvgAttributes = { ...drawing };

  if (id !== undefined) attributes.id = `${uid}-${id}`;

  if (clipPath !== undefined) attributes.clipPath = `url(#${uid}-${clipPath})`;

  return attributes;
};

const renderNode = (node: BeaverNode, uid: string, motion: PartMotion, key: number): ReactNode => {
  const children = node.children.map((child, index) => renderNode(child, uid, motion, index));
  const attributes = svgAttributes(node.attributes, uid);
  const animated = node.attributes.part === undefined ? undefined : motion[node.attributes.part];

  switch (node.tag) {
    case "g":
      return animated === undefined ? (
        <G key={key} {...attributes}>
          {children}
        </G>
      ) : (
        <AnimatedGroup key={key} {...attributes} animatedProps={animated}>
          {children}
        </AnimatedGroup>
      );
    case "path":
      return <Path key={key} {...attributes} />;
    case "circle":
      return <Circle key={key} {...attributes} />;
    case "ellipse":
      return <Ellipse key={key} {...attributes} />;
    case "rect":
      return <Rect key={key} {...attributes} />;
    case "defs":
      return <Defs key={key}>{children}</Defs>;
    case "clipPath":
      return (
        <ClipPath key={key} {...attributes}>
          {children}
        </ClipPath>
      );
  }
};

export const BeaverArt = ({ motion }: { readonly motion: PartMotion }) => {
  const uid = useId();

  return (
    <Svg width="100%" height="100%" viewBox={VIEW_BOX}>
      {BEAVER_ART.map((node, index) => renderNode(node, uid, motion, index))}
    </Svg>
  );
};
