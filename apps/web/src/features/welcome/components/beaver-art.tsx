import { BEAVER_ART, BEAVER_VIEW_BOX } from "@boberstack/ui/beaver";
import type { BeaverAttributes, BeaverNode } from "@boberstack/ui/beaver";
import { createElement, useId } from "react";
import type { ReactNode, Ref } from "react";

const domAttributes = (attributes: BeaverAttributes, id: string) =>
  Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => {
      if (name === "part") return ["className", `beaver-${String(value)}`];

      if (name === "id") return ["id", `${id}-${String(value)}`];

      if (name === "clipPath") return ["clipPath", `url(#${id}-${String(value)})`];

      return [name, value];
    }),
  );

const renderNode = (node: BeaverNode, id: string, key: number): ReactNode =>
  createElement(
    node.tag,
    { key, ...domAttributes(node.attributes, id) },
    ...node.children.map((child, index) => renderNode(child, id, index)),
  );

export const BeaverArt = ({ ref }: { readonly ref?: Ref<SVGSVGElement> }) => {
  const id = useId();

  return (
    <svg
      ref={ref}
      className="beaver"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={BEAVER_VIEW_BOX}
      role="img"
      aria-hidden="true"
    >
      {BEAVER_ART.map((node, index) => renderNode(node, id, index))}
    </svg>
  );
};
