import * as Types from '../type/index.mjs';
import { Module } from './runtime.mjs';
/** `[Syntax]` Parses a TypeBox type from TypeScript syntax. */
export function Parse(...args) {
    return ParseOnly.apply(null, args);
}
/** `[Syntax]` Parses a TypeBox TSchema from TypeScript syntax. This function does not infer the type. */
export function ParseOnly(...args) {
    const withContext = typeof args[0] === 'string' ? false : true;
    const [context, code, options] = withContext ? [args[0], args[1], args[2] || {}] : [{}, args[0], args[1] || {}];
    const type = Module.Parse('Main', code, context)[0];
    // Note: Parsing may return either a ModuleInstance or Type. We only apply options on the Type.
    return Types.KindGuard.IsSchema(type) ? Types.CloneType(type, options) : type;
}
