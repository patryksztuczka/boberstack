import { tester } from "../../../rule-tester.ts";
import { accessibleControlsRule } from "./accessible-controls.ts";

const screen = "apps/mobile/src/features/todos/components/todos-screen.tsx";

const imports = 'import { Pressable, Switch, Text, TextInput } from "react-native";\n';

const valid = (jsx: string, header = imports) => ({
  code: `${header}export const S = () => ${jsx};`,
  filename: screen,
});

const invalid = (jsx: string, messageIds: ReadonlyArray<string>, header = imports) => ({
  ...valid(jsx, header),
  errors: messageIds.map((messageId) => ({ messageId })),
});

tester.run("@boberstack/frontend/accessible-controls", accessibleControlsRule, {
  valid: [
    valid('<Pressable accessibilityRole="button" testID="sign-out"><Text>Out</Text></Pressable>'),
    valid('<Pressable role="link" testID="docs" />'),
    valid('<TextInput accessibilityLabel="Email" testID="sign-in-email" />'),
    valid('<TextInput aria-label="Email" testID="sign-in-email" />'),
    valid('<Switch accessibilityLabel="Done" testID="todo-done" />'),
    valid("<Pressable {...props} />"),
    valid("<Text>plain</Text>"),
    valid("<Pressable />", 'import { Pressable } from "./pressable.tsx";\n'),
    valid(
      '<Press accessibilityRole="button" testID="go" />',
      'import { Pressable as Press } from "react-native";\n',
    ),
    valid(
      '<RN.TextInput accessibilityLabel="Title" testID="title" />',
      'import * as RN from "react-native";\n',
    ),
  ],
  invalid: [
    invalid('<Pressable accessibilityRole="button"><Text>Retry</Text></Pressable>', ["testID"]),
    invalid('<Pressable testID="retry" />', ["role"]),
    invalid("<Pressable />", ["testID", "role"]),
    invalid('<TextInput testID="title" placeholder="Title" />', ["label"]),
    invalid('<Switch accessibilityLabel="Done" />', ["testID"]),
    invalid(
      "<Press />",
      ["testID", "role"],
      'import { Pressable as Press } from "react-native";\n',
    ),
    invalid(
      '<RN.TouchableOpacity testID="go" />',
      ["role"],
      'import * as RN from "react-native";\n',
    ),
  ],
});
