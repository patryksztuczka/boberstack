#!/usr/bin/env node
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { Command } from "effect/cli";

import { DbCommand } from "./commands/db.ts";
import { HealthCommand } from "./commands/health.ts";
import { OpenApiCommand } from "./commands/openapi.ts";

Command.make("boberstack").pipe(
  Command.withDescription("boberstack command line"),
  Command.withSubcommands([DbCommand, OpenApiCommand, HealthCommand]),
  Command.run({ version: "0.0.0" }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
