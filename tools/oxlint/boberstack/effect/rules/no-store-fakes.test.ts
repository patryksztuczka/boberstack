import { tester } from "../../../rule-tester.ts";
import { noStoreFakesRule } from "./no-store-fakes.ts";

const error = { messageId: "storeFake" };

const base = 'import { Context } from "effect";';

tester.run("@boberstack/effect/no-store-fakes", noStoreFakesRule, {
  valid: [
    `${base} class SampleStore extends Context.Service<SampleStore, {}>()("sample") {}`,
    `${base} class SampleService extends Context.Service<SampleService, {}>()("sample") { static layerTest = 1; }`,
    `${base} class SampleStore extends Context.Service<SampleStore, {}>()("sample") { layerTest = 1; }`,
    'const Context = { Service: () => () => class {} }; class SampleStore extends Context.Service()("sample") { static layerTest = 1; }',
    "class SampleStore extends ExternalService { static inMemory() {} }",
  ],
  invalid: [
    {
      code: `${base} class SampleStore extends Context.Service<SampleStore, {}>()("sample") { static readonly layerTest = (world: {}) => world; }`,
      errors: [error],
    },
    {
      code: `${base} class SampleStore extends Context.Service<SampleStore, {}>()("sample") { static inMemory(world: {}) { return world; } }`,
      errors: [error],
    },
    {
      code: 'import { Context as C } from "effect"; class SampleStore extends C.Service<SampleStore, {}>()("sample") { static layerTest = 1; }',
      errors: [error],
    },
    {
      code: 'import * as Context from "effect/Context"; class SampleStore extends Context.Service<SampleStore, {}>()("sample") { static ["inMemory"] = 1; }',
      errors: [error],
    },
    {
      code: `${base} const SampleStore = class extends Context.Service<SampleStore, {}>()("sample") { static "layerTest" = 1; };`,
      errors: [error],
    },
    {
      code: `${base} class SampleStore extends Context.Service<SampleStore, {}>()("sample") { static layerTest = 1; static inMemory = 2; }`,
      errors: [error, error],
    },
  ],
});
