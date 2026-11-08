import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

type Need = "testID" | "role" | "label";

const pressables: ReadonlyArray<Need> = ["testID", "role"];

const fields: ReadonlyArray<Need> = ["testID", "label"];

const controls: ReadonlyMap<string, ReadonlyArray<Need>> = new Map([
  ["Pressable", pressables],
  ["TouchableHighlight", pressables],
  ["TouchableNativeFeedback", pressables],
  ["TouchableOpacity", pressables],
  ["TouchableWithoutFeedback", pressables],
  ["TextInput", fields],
  ["Switch", fields],
  ["Button", ["testID"]],
]);

const props: Readonly<Record<Need, ReadonlyArray<string>>> = {
  testID: ["testID"],
  role: ["accessibilityRole", "role"],
  label: ["accessibilityLabel", "aria-label", "aria-labelledby", "accessibilityLabelledBy"],
};

const docs = "docs/operations/mobile.md#accessibility-and-test-ids";

const attributeName = (attribute: ESTree.JSXAttribute): string =>
  attribute.name.type === "JSXIdentifier"
    ? attribute.name.name
    : `${attribute.name.namespace.name}:${attribute.name.name.name}`;

export const accessibleControlsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Give every React Native control a testID, a role on pressables and a label on inputs, so agent-device and screen readers can find it.",
    },
    messages: {
      testID: `\`<{{element}}>\` needs a \`testID\`. agent-device and the verify-mobile skill find controls by it, so the id is part of the screen's contract: name it after what the control does, in kebab case, such as \`sign-in-submit\` (see ${docs}).`,
      role: `\`<{{element}}>\` needs an \`accessibilityRole\` (\`button\`, \`link\`, \`checkbox\`, …). Without one VoiceOver and agent-device see a plain view, not something to press (see ${docs}).`,
      label: `\`<{{element}}>\` needs an \`accessibilityLabel\`. A visible label next to an input is not tied to it, so VoiceOver and agent-device see an unnamed field; reuse the same message as the visible label (see ${docs}).`,
    },
    schema: [],
  },
  create(context) {
    const locals = new Map<string, string>();
    const namespaces = new Set<string>();

    const controlOf = (name: ESTree.JSXOpeningElement["name"]): string | undefined => {
      if (name.type === "JSXIdentifier") return locals.get(name.name);

      if (
        name.type === "JSXMemberExpression" &&
        name.object.type === "JSXIdentifier" &&
        namespaces.has(name.object.name) &&
        controls.has(name.property.name)
      ) {
        return name.property.name;
      }

      return undefined;
    };

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "react-native" || node.importKind === "type") return;

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportNamespaceSpecifier") {
            namespaces.add(specifier.local.name);
          } else if (
            specifier.type === "ImportSpecifier" &&
            specifier.importKind !== "type" &&
            specifier.imported.type === "Identifier" &&
            controls.has(specifier.imported.name)
          ) {
            locals.set(specifier.local.name, specifier.imported.name);
          }
        }
      },
      JSXOpeningElement(node) {
        const element = controlOf(node.name);

        if (element === undefined) return;

        if (node.attributes.some((attribute) => attribute.type === "JSXSpreadAttribute")) return;

        const present = new Set(
          node.attributes.flatMap((attribute) =>
            attribute.type === "JSXAttribute" ? [attributeName(attribute)] : [],
          ),
        );

        for (const need of controls.get(element) ?? []) {
          if (!props[need].some((prop) => present.has(prop))) {
            context.report({ node, messageId: need, data: { element } });
          }
        }
      },
    };
  },
});
