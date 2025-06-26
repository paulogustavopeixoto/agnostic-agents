import * as Types from '../type/index';
import { Static } from './parsebox/index';
import { Main } from './static';
/** `[Syntax]` Infers a TypeBox type from TypeScript syntax. */
export type StaticParseAsSchema<Context extends Record<PropertyKey, Types.TSchema>, Code extends string> = Static.Parse<Main, Code, Context>[0];
/** `[Syntax]` Infers a TypeScript type from TypeScript syntax. */
export type StaticParseAsType<Context extends Record<PropertyKey, Types.TSchema>, Code extends string> = StaticParseAsSchema<Context, Code> extends infer Type extends Types.TSchema ? Types.StaticDecode<Type> : undefined;
/** `[Syntax]` Parses a TypeBox type from TypeScript syntax. */
export declare function Parse<Context extends Record<PropertyKey, Types.TSchema>, Code extends string>(context: Context, code: Code, options?: Types.SchemaOptions): StaticParseAsSchema<Context, Code>;
/** `[Syntax]` Parses a TypeBox type from TypeScript syntax. */
export declare function Parse<Code extends string>(code: Code, options?: Types.SchemaOptions): StaticParseAsSchema<{}, Code>;
/** `[Syntax]` Parses a TypeBox TSchema from TypeScript syntax. This function does not infer the type. */
export declare function ParseOnly<Context extends Record<PropertyKey, Types.TSchema>, Code extends string>(context: Context, code: Code, options?: Types.SchemaOptions): Types.TSchema | undefined;
/** `[Syntax]` Parses a TypeBox TSchema from TypeScript syntax */
export declare function ParseOnly<Code extends string>(code: Code, options?: Types.SchemaOptions): Types.TSchema | undefined;
