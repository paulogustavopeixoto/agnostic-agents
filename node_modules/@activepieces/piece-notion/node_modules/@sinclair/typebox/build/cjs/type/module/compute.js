"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.FromType = FromType;
exports.ComputeType = ComputeType;
exports.ComputeModuleProperties = ComputeModuleProperties;
const index_1 = require("../create/index");
const index_2 = require("../discard/index");
const index_3 = require("../array/index");
const index_4 = require("../awaited/index");
const index_5 = require("../async-iterator/index");
const index_6 = require("../constructor/index");
const index_7 = require("../indexed/index");
const index_8 = require("../function/index");
const index_9 = require("../intersect/index");
const index_10 = require("../iterator/index");
const index_11 = require("../keyof/index");
const index_12 = require("../object/index");
const index_13 = require("../omit/index");
const index_14 = require("../pick/index");
const index_15 = require("../never/index");
const index_16 = require("../partial/index");
const index_17 = require("../record/index");
const index_18 = require("../required/index");
const index_19 = require("../tuple/index");
const index_20 = require("../union/index");
const index_21 = require("../symbols/index");
// ------------------------------------------------------------------
// KindGuard
// ------------------------------------------------------------------
const KindGuard = require("../guard/kind");
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
        : (0, index_15.Never)());
}
// prettier-ignore
function FromAwaited(parameters) {
    return (0, index_4.Awaited)(parameters[0]);
}
// prettier-ignore
function FromIndex(parameters) {
    return (0, index_7.Index)(parameters[0], parameters[1]);
}
// prettier-ignore
function FromKeyOf(parameters) {
    return (0, index_11.KeyOf)(parameters[0]);
}
// prettier-ignore
function FromPartial(parameters) {
    return (0, index_16.Partial)(parameters[0]);
}
// prettier-ignore
function FromOmit(parameters) {
    return (0, index_13.Omit)(parameters[0], parameters[1]);
}
// prettier-ignore
function FromPick(parameters) {
    return (0, index_14.Pick)(parameters[0], parameters[1]);
}
// prettier-ignore
function FromRecord(parameters) {
    return (0, index_17.Record)(parameters[0], parameters[1]);
}
// prettier-ignore
function FromRequired(parameters) {
    return (0, index_18.Required)(parameters[0]);
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
                                    (0, index_15.Never)());
}
function FromObject(moduleProperties, properties) {
    return (0, index_12.Object)(globalThis.Object.keys(properties).reduce((result, key) => {
        return { ...result, [key]: FromType(moduleProperties, properties[key]) };
    }, {}));
}
// prettier-ignore
function FromConstructor(moduleProperties, parameters, instanceType) {
    return (0, index_6.Constructor)(FromRest(moduleProperties, parameters), FromType(moduleProperties, instanceType));
}
// prettier-ignore
function FromFunction(moduleProperties, parameters, returnType) {
    return (0, index_8.Function)(FromRest(moduleProperties, parameters), FromType(moduleProperties, returnType));
}
function FromTuple(moduleProperties, types) {
    return (0, index_19.Tuple)(FromRest(moduleProperties, types));
}
function FromIntersect(moduleProperties, types) {
    return (0, index_9.Intersect)(FromRest(moduleProperties, types));
}
function FromUnion(moduleProperties, types) {
    return (0, index_20.Union)(FromRest(moduleProperties, types));
}
function FromArray(moduleProperties, type) {
    return (0, index_3.Array)(FromType(moduleProperties, type));
}
function FromAsyncIterator(moduleProperties, type) {
    return (0, index_5.AsyncIterator)(FromType(moduleProperties, type));
}
function FromIterator(moduleProperties, type) {
    return (0, index_10.Iterator)(FromType(moduleProperties, type));
}
function FromRest(moduleProperties, types) {
    return types.map((type) => FromType(moduleProperties, type));
}
// prettier-ignore
function FromType(moduleProperties, type) {
    return (
    // Modifier Unwrap - Reapplied via CreateType Options
    KindGuard.IsOptional(type) ? (0, index_1.CreateType)(FromType(moduleProperties, (0, index_2.Discard)(type, [index_21.OptionalKind])), type) :
        KindGuard.IsReadonly(type) ? (0, index_1.CreateType)(FromType(moduleProperties, (0, index_2.Discard)(type, [index_21.ReadonlyKind])), type) :
            // Traveral
            KindGuard.IsArray(type) ? (0, index_1.CreateType)(FromArray(moduleProperties, type.items), type) :
                KindGuard.IsAsyncIterator(type) ? (0, index_1.CreateType)(FromAsyncIterator(moduleProperties, type.items), type) :
                    KindGuard.IsComputed(type) ? (0, index_1.CreateType)(FromComputed(moduleProperties, type.target, type.parameters)) :
                        KindGuard.IsConstructor(type) ? (0, index_1.CreateType)(FromConstructor(moduleProperties, type.parameters, type.returns), type) :
                            KindGuard.IsFunction(type) ? (0, index_1.CreateType)(FromFunction(moduleProperties, type.parameters, type.returns), type) :
                                KindGuard.IsIntersect(type) ? (0, index_1.CreateType)(FromIntersect(moduleProperties, type.allOf), type) :
                                    KindGuard.IsIterator(type) ? (0, index_1.CreateType)(FromIterator(moduleProperties, type.items), type) :
                                        KindGuard.IsObject(type) ? (0, index_1.CreateType)(FromObject(moduleProperties, type.properties), type) :
                                            KindGuard.IsTuple(type) ? (0, index_1.CreateType)(FromTuple(moduleProperties, type.items || []), type) :
                                                KindGuard.IsUnion(type) ? (0, index_1.CreateType)(FromUnion(moduleProperties, type.anyOf), type) :
                                                    type);
}
// prettier-ignore
function ComputeType(moduleProperties, key) {
    return (key in moduleProperties
        ? FromType(moduleProperties, moduleProperties[key])
        : (0, index_15.Never)());
}
// prettier-ignore
function ComputeModuleProperties(moduleProperties) {
    return globalThis.Object.getOwnPropertyNames(moduleProperties).reduce((result, key) => {
        return { ...result, [key]: ComputeType(moduleProperties, key) };
    }, {});
}
