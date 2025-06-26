"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseDefault = exports.ParseRegistry = exports.ParseError = void 0;
exports.Parse = Parse;
const index_1 = require("../../type/error/index");
const index_2 = require("../transform/index");
const index_3 = require("../assert/index");
const index_4 = require("../default/index");
const index_5 = require("../convert/index");
const index_6 = require("../clean/index");
const index_7 = require("../clone/index");
// ------------------------------------------------------------------
// Guards
// ------------------------------------------------------------------
const index_8 = require("../guard/index");
// ------------------------------------------------------------------
// Error
// ------------------------------------------------------------------
class ParseError extends index_1.TypeBoxError {
    constructor(message) {
        super(message);
    }
}
exports.ParseError = ParseError;
// prettier-ignore
var ParseRegistry;
(function (ParseRegistry) {
    const registry = new Map([
        ['Clone', (_type, _references, value) => (0, index_7.Clone)(value)],
        ['Clean', (type, references, value) => (0, index_6.Clean)(type, references, value)],
        ['Default', (type, references, value) => (0, index_4.Default)(type, references, value)],
        ['Convert', (type, references, value) => (0, index_5.Convert)(type, references, value)],
        ['Assert', (type, references, value) => { (0, index_3.Assert)(type, references, value); return value; }],
        ['Decode', (type, references, value) => ((0, index_2.HasTransform)(type, references) ? (0, index_2.TransformDecode)(type, references, value) : value)],
        ['Encode', (type, references, value) => ((0, index_2.HasTransform)(type, references) ? (0, index_2.TransformEncode)(type, references, value) : value)],
    ]);
    // Deletes an entry from the registry
    function Delete(key) {
        registry.delete(key);
    }
    ParseRegistry.Delete = Delete;
    // Sets an entry in the registry
    function Set(key, callback) {
        registry.set(key, callback);
    }
    ParseRegistry.Set = Set;
    // Gets an entry in the registry
    function Get(key) {
        return registry.get(key);
    }
    ParseRegistry.Get = Get;
})(ParseRegistry || (exports.ParseRegistry = ParseRegistry = {}));
// ------------------------------------------------------------------
// Default Parse Sequence
// ------------------------------------------------------------------
// prettier-ignore
exports.ParseDefault = [
    'Clone',
    'Clean',
    'Default',
    'Convert',
    'Assert',
    'Decode'
];
// ------------------------------------------------------------------
// ParseValue
// ------------------------------------------------------------------
function ParseValue(operations, type, references, value) {
    return operations.reduce((value, operationKey) => {
        const operation = ParseRegistry.Get(operationKey);
        if ((0, index_8.IsUndefined)(operation))
            throw new ParseError(`Unable to find Parse operation '${operationKey}'`);
        return operation(type, references, value);
    }, value);
}
/** Parses a value */
function Parse(...args) {
    // prettier-ignore
    const [operations, schema, references, value] = (args.length === 4 ? [args[0], args[1], args[2], args[3]] :
        args.length === 3 ? (0, index_8.IsArray)(args[0]) ? [args[0], args[1], [], args[2]] : [exports.ParseDefault, args[0], args[1], args[2]] :
            args.length === 2 ? [exports.ParseDefault, args[0], [], args[1]] :
                (() => { throw new ParseError('Invalid Arguments'); })());
    return ParseValue(operations, schema, references, value);
}
