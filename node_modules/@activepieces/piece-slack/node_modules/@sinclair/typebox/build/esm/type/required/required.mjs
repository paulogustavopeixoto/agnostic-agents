import { CreateType } from '../create/type.mjs';
import { Computed } from '../computed/index.mjs';
import { Object } from '../object/index.mjs';
import { Intersect } from '../intersect/index.mjs';
import { Union } from '../union/index.mjs';
import { Ref } from '../ref/index.mjs';
import { OptionalKind, TransformKind } from '../symbols/index.mjs';
import { Discard } from '../discard/index.mjs';
import { RequiredFromMappedResult } from './required-from-mapped-result.mjs';
// ------------------------------------------------------------------
// TypeGuard
// ------------------------------------------------------------------
import { IsMappedResult, IsIntersect, IsUnion, IsObject, IsRef, IsComputed } from '../guard/kind.mjs';
// prettier-ignore
function FromComputed(target, parameters) {
    return Computed('Required', [Computed(target, parameters)]);
}
// prettier-ignore
function FromRef($ref) {
    return Computed('Required', [Ref($ref)]);
}
// prettier-ignore
function FromProperties(properties) {
    const requiredProperties = {};
    for (const K of globalThis.Object.getOwnPropertyNames(properties))
        requiredProperties[K] = Discard(properties[K], [OptionalKind]);
    return requiredProperties;
}
// prettier-ignore
function FromObject(type) {
    const options = Discard(type, [TransformKind, '$id', 'required', 'properties']);
    const properties = FromProperties(type['properties']);
    return Object(properties, options);
}
// prettier-ignore
function FromRest(types) {
    return types.map(type => RequiredResolve(type));
}
// ------------------------------------------------------------------
// RequiredResolve
// ------------------------------------------------------------------
// prettier-ignore
function RequiredResolve(type) {
    return (IsComputed(type) ? FromComputed(type.target, type.parameters) :
        IsRef(type) ? FromRef(type.$ref) :
            IsIntersect(type) ? Intersect(FromRest(type.allOf)) :
                IsUnion(type) ? Union(FromRest(type.anyOf)) :
                    IsObject(type) ? FromObject(type) :
                        Object({}));
}
/** `[Json]` Constructs a type where all properties are required */
export function Required(type, options) {
    if (IsMappedResult(type)) {
        return RequiredFromMappedResult(type, options);
    }
    else {
        // special: mapping types require overridable options
        return CreateType({ ...RequiredResolve(type), ...options });
    }
}
