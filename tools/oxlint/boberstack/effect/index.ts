import { eslintCompatPlugin } from "vite-plus/lint/plugins";

import { brandedIdsRule } from "./rules/branded-ids.ts";
import { effectFnNameRule } from "./rules/effect-fn-name.ts";
import { layerConfigOnlyInRootsRule } from "./rules/layer-config-only-in-roots.ts";
import { layerNamingRule } from "./rules/layer-naming.ts";
import { logLiteralMessageRule } from "./rules/log-literal-message.ts";
import { moduleBoundariesRule } from "./rules/module-boundaries.ts";
import { noDecodeSyncRule } from "./rules/no-decode-sync.ts";
import { noDomainAdaptersRule } from "./rules/no-domain-adapters.ts";
import { noDomainSqlRule } from "./rules/no-domain-sql.ts";
import { noErrorInstanceofRule } from "./rules/no-error-instanceof.ts";
import { noErrorSubclassRule } from "./rules/no-error-subclass.ts";
import { noNewPromiseRule } from "./rules/no-new-promise.ts";
import { noStoreFakesRule } from "./rules/no-store-fakes.ts";
import { noThrowInEffectRule } from "./rules/no-throw-in-effect.ts";
import { noTryInTestsRule } from "./rules/no-try-in-tests.ts";
import { noUntypedFailureRule } from "./rules/no-untyped-failure.ts";
import { redactedSecretsRule } from "./rules/redacted-secrets.ts";
import { retryRequiresWhileRule } from "./rules/retry-requires-while.ts";
import { runOnlyInEntryPointsRule } from "./rules/run-only-in-entry-points.ts";
import { serviceExplicitApiRule } from "./rules/service-explicit-shape.ts";
import { serviceIdMatchesPathRule } from "./rules/service-id-matches-path.ts";
import { taggedErrorNamingRule } from "./rules/tagged-error-naming.ts";
import { tryRequiresCatchRule } from "./rules/try-requires-catch.ts";

const effectPlugin = eslintCompatPlugin({
  meta: { name: "effect" },
  rules: {
    "branded-ids": brandedIdsRule,
    "effect-fn-name": effectFnNameRule,
    "layer-config-only-in-roots": layerConfigOnlyInRootsRule,
    "layer-naming": layerNamingRule,
    "log-literal-message": logLiteralMessageRule,
    "module-boundaries": moduleBoundariesRule,
    "no-decode-sync": noDecodeSyncRule,
    "no-domain-adapters": noDomainAdaptersRule,
    "no-domain-sql": noDomainSqlRule,
    "no-error-instanceof": noErrorInstanceofRule,
    "no-error-subclass": noErrorSubclassRule,
    "no-new-promise": noNewPromiseRule,
    "no-store-fakes": noStoreFakesRule,
    "no-throw-in-effect": noThrowInEffectRule,
    "no-try-in-tests": noTryInTestsRule,
    "no-untyped-failure": noUntypedFailureRule,
    "redacted-secrets": redactedSecretsRule,
    "retry-requires-while": retryRequiresWhileRule,
    "run-only-in-entry-points": runOnlyInEntryPointsRule,
    "service-explicit-shape": serviceExplicitApiRule,
    "service-id-matches-path": serviceIdMatchesPathRule,
    "tagged-error-naming": taggedErrorNamingRule,
    "try-requires-catch": tryRequiresCatchRule,
  },
});

export default effectPlugin;
