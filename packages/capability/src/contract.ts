import type { Schema } from "effect";

export interface Annotations {
  readonly readOnly: boolean;
  readonly destructive: boolean;
  readonly idempotent: boolean;
  readonly openWorld: boolean;
}

export type PlainSchema = Schema.Top & {
  readonly DecodingServices: never;
  readonly EncodingServices: never;
};

export type InputSchema = Schema.Struct<Record<string, PlainSchema>>;

export type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export interface HttpRoute {
  readonly method: HttpMethod;
  readonly path: `/${string}`;
  readonly status?: number | undefined;
}

type SegmentParam<Segment extends string> = Segment extends `:${infer Name}` ? Name : never;

export type PathParamNames<Path extends string> = Path extends `${infer Segment}/${infer Rest}`
  ? SegmentParam<Segment> | PathParamNames<Rest>
  : SegmentParam<Path>;

type StrayParams<Http extends HttpRoute, Input extends InputSchema> = Exclude<
  PathParamNames<Http["path"]>,
  keyof Input["fields"]
>;

export type RouteParamsCheck<Http, Input extends InputSchema> = Http extends HttpRoute
  ? [StrayParams<Http, Input>] extends [never]
    ? unknown
    : Readonly<
        Record<`path parameter :${StrayParams<Http, Input> & string} is not an input field`, never>
      >
  : unknown;

export interface Contract<
  Name extends string,
  Input extends InputSchema,
  Output extends PlainSchema,
  Failure extends PlainSchema,
  Http extends HttpRoute | undefined = undefined,
> {
  readonly name: Name;
  readonly title: string;
  readonly description: string;
  readonly input: Input;
  readonly output: Output;
  readonly failure: Failure;
  readonly annotations: Annotations;
  readonly http: Http;
}

export type AnyContract = Contract<
  string,
  InputSchema,
  PlainSchema,
  PlainSchema,
  HttpRoute | undefined
>;

export type NameOf<C> = C extends { readonly name: infer Name extends string } ? Name : never;

export type InputOf<C> = C extends { readonly input: infer Input extends InputSchema }
  ? Input
  : never;

export type OutputOf<C> = C extends { readonly output: infer Output extends PlainSchema }
  ? Output
  : never;

export type FailureOf<C> = C extends { readonly failure: infer Failure extends PlainSchema }
  ? Failure
  : never;

export type DecodedInput = Schema.Struct.Type<Record<string, PlainSchema>>;

export type HttpRouteOf<C> = C extends { readonly http: infer Route extends HttpRoute }
  ? Route
  : undefined;

export interface DefineContractOptions<
  Input extends InputSchema,
  Output extends PlainSchema,
  Failure extends PlainSchema,
  Http extends HttpRoute | undefined,
> {
  readonly title: string;
  readonly description: string;
  readonly input: Input;
  readonly output: Output;
  readonly failure: Failure;
  readonly annotations?: Partial<Annotations> | undefined;
  readonly http?: Http;
}

const defaultAnnotations: Annotations = {
  readOnly: false,
  destructive: false,
  idempotent: false,
  openWorld: false,
};

export const defineContract = <
  const Name extends string,
  Input extends InputSchema,
  Output extends PlainSchema,
  Failure extends PlainSchema,
  const Http extends HttpRoute | undefined = undefined,
>(
  name: Name,
  options: DefineContractOptions<Input, Output, Failure, Http> & RouteParamsCheck<Http, Input>,
): Contract<Name, Input, Output, Failure, Http> => ({
  name,
  title: options.title,
  description: options.description,
  input: options.input,
  output: options.output,
  failure: options.failure,
  annotations: { ...defaultAnnotations, ...options.annotations },
  // SAFETY: `http` may be left out only when `Http` is `undefined`, so the missing route is exactly `Http`.
  http: options.http as Http,
});
