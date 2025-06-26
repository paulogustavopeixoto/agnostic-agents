import type { TSchema, SchemaOptions } from '../schema/index';
import type { Evaluate, Ensure } from '../helpers/index';
import type { TMappedResult } from '../mapped/index';
import { type TReadonlyOptional } from '../readonly-optional/index';
import { type TComputed } from '../computed/index';
import { type TOptional } from '../optional/index';
import { type TReadonly } from '../readonly/index';
import { type TRecursive } from '../recursive/index';
import { type TObject, type TProperties } from '../object/index';
import { type TIntersect } from '../intersect/index';
import { type TUnion } from '../union/index';
import { type TRef } from '../ref/index';
import { type TPartialFromMappedResult } from './partial-from-mapped-result';
type TFromComputed<Target extends string, Parameters extends TSchema[]> = Ensure<TComputed<'Partial', [TComputed<Target, Parameters>]>>;
type TFromRef<Ref extends string> = Ensure<TComputed<'Partial', [TRef<Ref>]>>;
type TFromProperties<Properties extends TProperties> = Evaluate<{
    [K in keyof Properties]: Properties[K] extends (TReadonlyOptional<infer S>) ? TReadonlyOptional<S> : Properties[K] extends (TReadonly<infer S>) ? TReadonlyOptional<S> : Properties[K] extends (TOptional<infer S>) ? TOptional<S> : TOptional<Properties[K]>;
}>;
type TFromObject<Type extends TObject, Properties extends TProperties = Type['properties']> = Ensure<TObject<(TFromProperties<Properties>)>>;
type TFromRest<Types extends TSchema[], Result extends TSchema[] = []> = (Types extends [infer L extends TSchema, ...infer R extends TSchema[]] ? TFromRest<R, [...Result, TPartial<L>]> : Result);
export type TPartial<T extends TSchema> = (T extends TRecursive<infer Type extends TSchema> ? TRecursive<TPartial<Type>> : T extends TComputed<infer Target extends string, infer Parameters extends TSchema[]> ? TFromComputed<Target, Parameters> : T extends TRef<infer Ref extends string> ? TFromRef<Ref> : T extends TIntersect<infer Types extends TSchema[]> ? TIntersect<TFromRest<Types>> : T extends TUnion<infer Types extends TSchema[]> ? TUnion<TFromRest<Types>> : T extends TObject<infer Properties extends TProperties> ? TFromObject<TObject<Properties>> : TObject<{}>);
/** `[Json]` Constructs a type where all properties are optional */
export declare function Partial<MappedResult extends TMappedResult>(type: MappedResult, options?: SchemaOptions): TPartialFromMappedResult<MappedResult>;
/** `[Json]` Constructs a type where all properties are optional */
export declare function Partial<Type extends TSchema>(type: Type, options?: SchemaOptions): TPartial<Type>;
export {};
