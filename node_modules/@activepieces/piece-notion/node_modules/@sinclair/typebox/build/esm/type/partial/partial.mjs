import { CreateType } from '../create/type.mjs';
import { Computed } from '../computed/index.mjs';
import { Optional } from '../optional/index.mjs';
import { Object } from '../object/index.mjs';
import { Intersect } from '../intersect/index.mjs';
import { Union } from '../union/index.mjs';
import { Ref } from '../ref/index.mjs';
import { Discard } from '../discard/index.mjs';
import { TransformKind } from '../symbols/index.mjs';
import { PartialFromMappedResult } from './partial-from-mapped-result.mjs';
// ------------------------------------------------------------------
// TypeGuard
// ------------------------------------------------------------------
import { IsMappedResult, IsIntersect, IsUnion, IsObject, IsRef, IsComputed } from '../guard/kind.mjs';
// prettier-ignore
function FromComputed(target, parameters) {
    return Computed('Partial', [Computed(target, parameters)]);
}
// prettier-ignore
function FromRef($ref) {
    return Computed('Partial', [Ref($ref)]);
}
// prettier-ignore
function FromProperties(properties) {
    const partialProperties = {};
    for (const K of globalThis.Object.getOwnPropertyNames(properties))
        partialProperties[K] = Optional(properties[K]);
    return partialProperties;
}
// prettier-ignore
function FromObject(T) {
    const options = Discard(T, [TransformKind, '$id', 'required', 'properties']);
    const properties = FromProperties(T['properties']);
    return Object(properties, options);
}
// prettier-ignore
function FromRest(types) {
    return types.map(type => PartialResolve(type));
}
// ------------------------------------------------------------------
// PartialResolve
// ------------------------------------------------------------------
// prettier-ignore
function PartialResolve(type) {
    return (IsComputed(type) ? FromComputed(type.target, type.parameters) :
        IsRef(type) ? FromRef(type.$ref) :
            IsIntersect(type) ? Intersect(FromRest(type.allOf)) :
                IsUnion(type) ? Union(FromRest(type.anyOf)) :
                    IsObject(type) ? FromObject(type) :
                        Object({}));
}
/** `[Json]` Constructs a type where all properties are optional */
export function Partial(type, options) {
    if (IsMappedResult(type)) {
        return PartialFromMappedResult(type, options);
    }
    else {
        // special: mapping types require overridable options
        return CreateType({ ...PartialResolve(type), ...options });
    }
}
