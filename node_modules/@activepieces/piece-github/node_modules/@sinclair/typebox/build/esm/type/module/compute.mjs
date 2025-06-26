import { CreateType } from '../create/index.mjs';
import { Discard } from '../discard/index.mjs';
import { Array } from '../array/index.mjs';
import { Awaited } from '../awaited/index.mjs';
import { AsyncIterator } from '../async-iterator/index.mjs';
import { Constructor } from '../constructor/index.mjs';
import { Index } from '../indexed/index.mjs';
import { Function as FunctionType } from '../function/index.mjs';
import { Intersect } from '../intersect/index.mjs';
import { Iterator } from '../iterator/index.mjs';
import { KeyOf } from '../keyof/index.mjs';
import { Object } from '../object/index.mjs';
import { Omit } from '../omit/index.mjs';
import { Pick } from '../pick/index.mjs';
import { Never } from '../never/index.mjs';
import { Partial } from '../partial/index.mjs';
import { Record } from '../record/index.mjs';
import { Required } from '../required/index.mjs';
import { Tuple } from '../tuple/index.mjs';
import { Union } from '../union/index.mjs';
import { OptionalKind, ReadonlyKind } from '../symbols/index.mjs';
// ------------------------------------------------------------------
// KindGuard
// ------------------------------------------------------------------
import * as KindGuard from '../guard/kind.mjs';
// prettier-ignore
function DerefParameters(moduleProperties, types) {
    return types.map((type) => {
        return KindGuard.IsRef(type)
            ? Deref(moduleProperties, type.$ref)
            : FromType(moduleProperties, type);
    });
}
// prettier-ignore
function Deref(moduleProperties, ref) {
    return (ref in moduleProperties
        ? KindGuard.IsRef(moduleProperties[ref])
            ? Deref(moduleProperties, moduleProperties[ref].$ref)
            : FromType(moduleProperties, moduleProperties[ref])
        : Never());
}
// prettier-ignore
function FromAwaited(parameters) {
    return Awaited(parameters[0]);
}
// prettier-ignore
function FromIndex(parameters) {
    return Index(parameters[0], parameters[1]);
}
// prettier-ignore
function FromKeyOf(parameters) {
    return KeyOf(parameters[0]);
}
// prettier-ignore
function FromPartial(parameters) {
    return Partial(parameters[0]);
}
// prettier-ignore
function FromOmit(parameters) {
    return Omit(parameters[0], parameters[1]);
}
// prettier-ignore
function FromPick(parameters) {
    return Pick(parameters[0], parameters[1]);
}
// prettier-ignore
function FromRecord(parameters) {
    return Record(parameters[0], parameters[1]);
}
// prettier-ignore
function FromRequired(parameters) {
    return Required(parameters[0]);
}
// prettier-ignore
function FromComputed(moduleProperties, target, parameters) {
    const dereferenced = DerefParameters(moduleProperties, parameters);
    return (target === 'Awaited' ? FromAwaited(dereferenced) :
        target === 'Index' ? FromIndex(dereferenced) :
            target === 'KeyOf' ? FromKeyOf(dereferenced) :
                target === 'Partial' ? FromPartial(dereferenced) :
                    target === 'Omit' ? FromOmit(dereferenced) :
                        target === 'Pick' ? FromPick(dereferenced) :
                            target === 'Record' ? FromRecord(dereferenced) :
                                target === 'Required' ? FromRequired(dereferenced) :
                                    Never());
}
function FromObject(moduleProperties, properties) {
    return Object(globalThis.Object.keys(properties).reduce((result, key) => {
        return { ...result, [key]: FromType(moduleProperties, properties[key]) };
    }, {}));
}
// prettier-ignore
function FromConstructor(moduleProperties, parameters, instanceType) {
    return Constructor(FromRest(moduleProperties, parameters), FromType(moduleProperties, instanceType));
}
// prettier-ignore
function FromFunction(moduleProperties, parameters, returnType) {
    return FunctionType(FromRest(moduleProperties, parameters), FromType(moduleProperties, returnType));
}
function FromTuple(moduleProperties, types) {
    return Tuple(FromRest(moduleProperties, types));
}
function FromIntersect(moduleProperties, types) {
    return Intersect(FromRest(moduleProperties, types));
}
function FromUnion(moduleProperties, types) {
    return Union(FromRest(moduleProperties, types));
}
function FromArray(moduleProperties, type) {
    return Array(FromType(moduleProperties, type));
}
function FromAsyncIterator(moduleProperties, type) {
    return AsyncIterator(FromType(moduleProperties, type));
}
function FromIterator(moduleProperties, type) {
    return Iterator(FromType(moduleProperties, type));
}
function FromRest(moduleProperties, types) {
    return types.map((type) => FromType(moduleProperties, type));
}
// prettier-ignore
export function FromType(moduleProperties, type) {
    return (
    // Modifier Unwrap - Reapplied via CreateType Options
    KindGuard.IsOptional(type) ? CreateType(FromType(moduleProperties, Discard(type, [OptionalKind])), type) :
        KindGuard.IsReadonly(type) ? CreateType(FromType(moduleProperties, Discard(type, [ReadonlyKind])), type) :
            // Traveral
            KindGuard.IsArray(type) ? CreateType(FromArray(moduleProperties, type.items), type) :
                KindGuard.IsAsyncIterator(type) ? CreateType(FromAsyncIterator(moduleProperties, type.items), type) :
                    KindGuard.IsComputed(type) ? CreateType(FromComputed(moduleProperties, type.target, type.parameters)) :
                        KindGuard.IsConstructor(type) ? CreateType(FromConstructor(moduleProperties, type.parameters, type.returns), type) :
                            KindGuard.IsFunction(type) ? CreateType(FromFunction(moduleProperties, type.parameters, type.returns), type) :
                                KindGuard.IsIntersect(type) ? CreateType(FromIntersect(moduleProperties, type.allOf), type) :
                                    KindGuard.IsIterator(type) ? CreateType(FromIterator(moduleProperties, type.items), type) :
                                        KindGuard.IsObject(type) ? CreateType(FromObject(moduleProperties, type.properties), type) :
                                            KindGuard.IsTuple(type) ? CreateType(FromTuple(moduleProperties, type.items || []), type) :
                                                KindGuard.IsUnion(type) ? CreateType(FromUnion(moduleProperties, type.anyOf), type) :
                                                    type);
}
// prettier-ignore
export function ComputeType(moduleProperties, key) {
    return (key in moduleProperties
        ? FromType(moduleProperties, moduleProperties[key])
        : Never());
}
// prettier-ignore
export function ComputeModuleProperties(moduleProperties) {
    return globalThis.Object.getOwnPropertyNames(moduleProperties).reduce((result, key) => {
        return { ...result, [key]: ComputeType(moduleProperties, key) };
    }, {});
}
