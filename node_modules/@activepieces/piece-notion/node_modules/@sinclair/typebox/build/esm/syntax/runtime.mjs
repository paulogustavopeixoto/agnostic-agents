import { Runtime } from './parsebox/index.mjs';
import * as Types from '../type/index.mjs';
// ------------------------------------------------------------------
// Tokens
// ------------------------------------------------------------------
const Newline = '\n';
const LBracket = '[';
const RBracket = ']';
const LParen = '(';
const RParen = ')';
const LBrace = '{';
const RBrace = '}';
const LAngle = '<';
const RAngle = '>';
const Question = '?';
const Colon = ':';
const Comma = ',';
const SemiColon = ';';
const SingleQuote = "'";
const DoubleQuote = '"';
const Tilde = '`';
const Equals = '=';
// ------------------------------------------------------------------
// DestructureRight
// ------------------------------------------------------------------
// prettier-ignore
function DestructureRight(values) {
    return (values.length > 0)
        ? [values.slice(0, values.length - 1), values[values.length - 1]]
        : [values, undefined];
}
// ------------------------------------------------------------------
// Deref
// ------------------------------------------------------------------
const Deref = (context, key) => {
    return key in context ? context[key] : Types.Ref(key);
};
// ------------------------------------------------------------------
// ExportModifier
// ------------------------------------------------------------------
// prettier-ignore
const ExportModifierMapping = (values) => {
    return values.length === 1;
};
// prettier-ignore
const ExportModifier = Runtime.Union([
    Runtime.Tuple([Runtime.Const('export')]), Runtime.Tuple([])
], ExportModifierMapping);
// ------------------------------------------------------------------
// TypeAliasDeclaration
// ------------------------------------------------------------------
// prettier-ignore
const TypeAliasDeclarationMapping = (_Export, _Keyword, Ident, _Equals, Type) => {
    return { [Ident]: Type };
};
// prettier-ignore
const TypeAliasDeclaration = Runtime.Tuple([
    Runtime.Ref('ExportModifier'),
    Runtime.Const('type'),
    Runtime.Ident(),
    Runtime.Const(Equals),
    Runtime.Ref('Type')
], value => TypeAliasDeclarationMapping(...value));
// ------------------------------------------------------------------
// HeritageList
// ------------------------------------------------------------------
// prettier-ignore (note, heritage list should disallow trailing comma)
const HeritageListDelimiter = Runtime.Union([Runtime.Tuple([Runtime.Const(Comma), Runtime.Const(Newline)]), Runtime.Tuple([Runtime.Const(Comma)])]);
// prettier-ignore
const HeritageListMapping = (values, context) => {
    return (values.length === 3 ? [Deref(context, values[0]), ...values[2]] :
        values.length === 1 ? [Deref(context, values[0])] :
            []);
};
// prettier-ignore
const HeritageList = Runtime.Union([
    Runtime.Tuple([Runtime.Ident(), HeritageListDelimiter, Runtime.Ref('HeritageList')]),
    Runtime.Tuple([Runtime.Ident()]),
    Runtime.Tuple([])
], HeritageListMapping);
// ------------------------------------------------------------------
// Heritage
// ------------------------------------------------------------------
// prettier-ignore
const HeritageMapping = (values) => {
    return (values.length === 2 ? values[1] : []);
};
// prettier-ignore
const Heritage = Runtime.Union([
    Runtime.Tuple([Runtime.Const('extends'), Runtime.Ref('HeritageList')]),
    Runtime.Tuple([])
], HeritageMapping);
// ------------------------------------------------------------------
// InterfaceDeclaration
// ------------------------------------------------------------------
// prettier-ignore
const InterfaceDeclarationMapping = (_0, _1, Ident, Heritage, _4, Properties, _6) => {
    return { [Ident]: Types.Intersect([...Heritage, Types.Object(Properties)]) };
};
// prettier-ignore
const InterfaceDeclaration = Runtime.Tuple([
    Runtime.Ref('ExportModifier'),
    Runtime.Const('interface'),
    Runtime.Ident(),
    Runtime.Ref('Heritage'),
    Runtime.Const(LBrace),
    Runtime.Ref('Properties'),
    Runtime.Const(RBrace),
], values => InterfaceDeclarationMapping(...values));
// ------------------------------------------------------------------
// ModuleType
// ------------------------------------------------------------------
// prettier-ignore
const ModuleType = Runtime.Union([
    Runtime.Ref('InterfaceDeclaration'),
    Runtime.Ref('TypeAliasDeclaration')
]);
// ------------------------------------------------------------------
// ModuleProperties
// ------------------------------------------------------------------
// prettier-ignore
const ModulePropertiesDelimiter = Runtime.Union([
    Runtime.Tuple([Runtime.Const(SemiColon), Runtime.Const(Newline)]),
    Runtime.Tuple([Runtime.Const(SemiColon)]),
    Runtime.Tuple([Runtime.Const(Newline)]),
]);
// prettier-ignore
const ModulePropertiesMapping = (values) => {
    return (values.length === 3 ? { ...values[0], ...values[2] } :
        values.length === 1 ? values[0] :
            {});
};
// prettier-ignore
const ModuleProperties = Runtime.Union([
    Runtime.Tuple([Runtime.Ref('ModuleType'), ModulePropertiesDelimiter, Runtime.Ref('ModuleProperties')]),
    Runtime.Tuple([Runtime.Ref('ModuleType')]),
    Runtime.Tuple([]),
], ModulePropertiesMapping);
// ------------------------------------------------------------------
// ModuleDeclaration
// ------------------------------------------------------------------
// prettier-ignore
const ModuleIdentifier = Runtime.Union([
    Runtime.Tuple([Runtime.Ident()]),
    Runtime.Tuple([])
]);
// prettier-ignore
const ModuleDeclarationMapping = (_1, _2, _Ident, _3, Properties, _5) => {
    return Types.Module(Properties);
};
// prettier-ignore
const ModuleDeclaration = Runtime.Tuple([
    Runtime.Ref('ExportModifier'), Runtime.Const('module'), ModuleIdentifier, Runtime.Const(LBrace), Runtime.Ref('ModuleProperties'), Runtime.Const(RBrace)
], values => ModuleDeclarationMapping(...values));
// ------------------------------------------------------------------
// Reference
// ------------------------------------------------------------------
// prettier-ignore
const Reference = Runtime.Ident((value, context) => Deref(context, value));
// ------------------------------------------------------------------
// Literal
// ------------------------------------------------------------------
// prettier-ignore
const Literal = Runtime.Union([
    Runtime.Union([Runtime.Const('true'), Runtime.Const('false')], value => Types.Literal(value === 'true')),
    Runtime.Number(value => Types.Literal(parseFloat(value))),
    Runtime.String([SingleQuote, DoubleQuote, Tilde], value => Types.Literal(value))
]);
// ------------------------------------------------------------------
// Keyword
// ------------------------------------------------------------------
// prettier-ignore
const Keyword = Runtime.Union([
    Runtime.Const('any', Runtime.As(Types.Any())),
    Runtime.Const('bigint', Runtime.As(Types.BigInt())),
    Runtime.Const('boolean', Runtime.As(Types.Boolean())),
    Runtime.Const('integer', Runtime.As(Types.Integer())),
    Runtime.Const('never', Runtime.As(Types.Never())),
    Runtime.Const('null', Runtime.As(Types.Null())),
    Runtime.Const('number', Runtime.As(Types.Number())),
    Runtime.Const('string', Runtime.As(Types.String())),
    Runtime.Const('symbol', Runtime.As(Types.Symbol())),
    Runtime.Const('undefined', Runtime.As(Types.Undefined())),
    Runtime.Const('unknown', Runtime.As(Types.Unknown())),
    Runtime.Const('void', Runtime.As(Types.Void())),
]);
// ------------------------------------------------------------------
// KeyOf
// ------------------------------------------------------------------
// prettier-ignore
const KeyOfMapping = (values) => (values.length > 0);
// prettier-ignore
const KeyOf = Runtime.Union([
    Runtime.Tuple([Runtime.Const('keyof')]), Runtime.Tuple([])
], KeyOfMapping);
// ------------------------------------------------------------------
// IndexArray
// ------------------------------------------------------------------
// prettier-ignore
const IndexArrayMapping = (values) => (values.length === 4 ? [[values[1]], ...values[3]] :
    values.length === 3 ? [[], ...values[2]] :
        []);
// prettier-ignore
const IndexArray = Runtime.Union([
    Runtime.Tuple([Runtime.Const(LBracket), Runtime.Ref('Type'), Runtime.Const(RBracket), Runtime.Ref('IndexArray')]),
    Runtime.Tuple([Runtime.Const(LBracket), Runtime.Const(RBracket), Runtime.Ref('IndexArray')]),
    Runtime.Tuple([])
], value => IndexArrayMapping(value));
// ------------------------------------------------------------------
// Extends
// ------------------------------------------------------------------
// prettier-ignore
const ExtendsMapping = (values) => {
    return values.length === 6
        ? [values[1], values[3], values[5]]
        : [];
};
// prettier-ignore
const Extends = Runtime.Union([
    Runtime.Tuple([Runtime.Const('extends'), Runtime.Ref('Type'), Runtime.Const(Question), Runtime.Ref('Type'), Runtime.Const(Colon), Runtime.Ref('Type')]),
    Runtime.Tuple([])
], ExtendsMapping);
// ------------------------------------------------------------------
// Base
// ------------------------------------------------------------------
// prettier-ignore
const BaseMapping = (values) => {
    return values.length === 3 ? values[1] : values[0];
};
// prettier-ignore
const Base = Runtime.Union([
    Runtime.Tuple([
        Runtime.Const(LParen),
        Runtime.Ref('Type'),
        Runtime.Const(RParen)
    ]),
    Runtime.Tuple([Runtime.Union([
            Runtime.Ref('Literal'),
            Runtime.Ref('Keyword'),
            Runtime.Ref('Object'),
            Runtime.Ref('Tuple'),
            Runtime.Ref('Constructor'),
            Runtime.Ref('Function'),
            Runtime.Ref('Mapped'),
            Runtime.Ref('AsyncIterator'),
            Runtime.Ref('Iterator'),
            Runtime.Ref('ConstructorParameters'),
            Runtime.Ref('FunctionParameters'),
            Runtime.Ref('InstanceType'),
            Runtime.Ref('ReturnType'),
            Runtime.Ref('Awaited'),
            Runtime.Ref('Array'),
            Runtime.Ref('Record'),
            Runtime.Ref('Promise'),
            Runtime.Ref('Partial'),
            Runtime.Ref('Required'),
            Runtime.Ref('Pick'),
            Runtime.Ref('Omit'),
            Runtime.Ref('Exclude'),
            Runtime.Ref('Extract'),
            Runtime.Ref('Uppercase'),
            Runtime.Ref('Lowercase'),
            Runtime.Ref('Capitalize'),
            Runtime.Ref('Uncapitalize'),
            Runtime.Ref('Date'),
            Runtime.Ref('Uint8Array'),
            Runtime.Ref('Reference')
        ])])
], BaseMapping);
// ------------------------------------------------------------------
// Factor
// ------------------------------------------------------------------
// prettier-ignore
const FactorExtends = (Type, Extends) => {
    return Extends.length === 3
        ? Types.Extends(Type, Extends[0], Extends[1], Extends[2])
        : Type;
};
// prettier-ignore
const FactorIndexArray = (Type, IndexArray) => {
    const [Left, Right] = DestructureRight(IndexArray);
    return (!Types.ValueGuard.IsUndefined(Right) ? (
    // note: Indexed types require reimplementation to replace `[number]` indexers
    Right.length === 1 ? Types.Index(FactorIndexArray(Type, Left), Right[0]) :
        Right.length === 0 ? Types.Array(FactorIndexArray(Type, Left)) :
            Types.Never()) : Type);
};
// prettier-ignore
const FactorMapping = (KeyOf, Type, IndexArray, Extends) => {
    return KeyOf
        ? FactorExtends(Types.KeyOf(FactorIndexArray(Type, IndexArray)), Extends)
        : FactorExtends(FactorIndexArray(Type, IndexArray), Extends);
};
// prettier-ignore
const Factor = Runtime.Tuple([
    Runtime.Ref('KeyOf'),
    Runtime.Ref('Base'),
    Runtime.Ref('IndexArray'),
    Runtime.Ref('Extends')
], values => FactorMapping(...values));
// ------------------------------------------------------------------
// Expr
// ------------------------------------------------------------------
// prettier-ignore
function ExprBinaryMapping(Left, Rest) {
    return (Rest.length === 3 ? (() => {
        const [Operator, Right, Next] = Rest;
        const Schema = ExprBinaryMapping(Right, Next);
        if (Operator === '&') {
            return Types.TypeGuard.IsIntersect(Schema)
                ? Types.Intersect([Left, ...Schema.allOf])
                : Types.Intersect([Left, Schema]);
        }
        if (Operator === '|') {
            return Types.TypeGuard.IsUnion(Schema)
                ? Types.Union([Left, ...Schema.anyOf])
                : Types.Union([Left, Schema]);
        }
        throw 1;
    })() : Left);
}
// prettier-ignore
const ExprTermTail = Runtime.Union([
    Runtime.Tuple([Runtime.Const('&'), Runtime.Ref('Factor'), Runtime.Ref('ExprTermTail')]),
    Runtime.Tuple([])
]);
// prettier-ignore
const ExprTerm = Runtime.Tuple([
    Runtime.Ref('Factor'), Runtime.Ref('ExprTermTail')
], value => ExprBinaryMapping(...value));
// prettier-ignore
const ExprTail = Runtime.Union([
    Runtime.Tuple([Runtime.Const('|'), Runtime.Ref('ExprTerm'), Runtime.Ref('ExprTail')]),
    Runtime.Tuple([])
]);
// prettier-ignore
const Expr = Runtime.Tuple([
    Runtime.Ref('ExprTerm'), Runtime.Ref('ExprTail')
], value => ExprBinaryMapping(...value));
// ------------------------------------------------------------------
// Type
// ------------------------------------------------------------------
const Type = Runtime.Ref('Expr');
// ------------------------------------------------------------------
// Properties
// ------------------------------------------------------------------
const PropertyKey = Runtime.Union([Runtime.Ident(), Runtime.String([SingleQuote, DoubleQuote])]);
const Readonly = Runtime.Union([Runtime.Tuple([Runtime.Const('readonly')]), Runtime.Tuple([])], (value) => value.length > 0);
const Optional = Runtime.Union([Runtime.Tuple([Runtime.Const(Question)]), Runtime.Tuple([])], (value) => value.length > 0);
// prettier-ignore
const PropertyMapping = (IsReadonly, Key, IsOptional, _, Type) => ({
    [Key]: (IsReadonly && IsOptional ? Types.ReadonlyOptional(Type) :
        IsReadonly && !IsOptional ? Types.Readonly(Type) :
            !IsReadonly && IsOptional ? Types.Optional(Type) :
                Type)
});
// prettier-ignore
const Property = Runtime.Tuple([
    Runtime.Ref('Readonly'),
    Runtime.Ref('PropertyKey'),
    Runtime.Ref('Optional'),
    Runtime.Const(Colon),
    Runtime.Ref('Type'),
], value => PropertyMapping(...value));
// prettier-ignore
const PropertyDelimiter = Runtime.Union([
    Runtime.Tuple([Runtime.Const(Comma), Runtime.Const(Newline)]),
    Runtime.Tuple([Runtime.Const(SemiColon), Runtime.Const(Newline)]),
    Runtime.Tuple([Runtime.Const(Comma)]),
    Runtime.Tuple([Runtime.Const(SemiColon)]),
    Runtime.Tuple([Runtime.Const(Newline)]),
]);
// prettier-ignore
const Properties = Runtime.Union([
    Runtime.Tuple([Runtime.Ref('Property'), Runtime.Ref('PropertyDelimiter'), Runtime.Ref('Properties')]),
    Runtime.Tuple([Runtime.Ref('Property'), Runtime.Ref('PropertyDelimiter')]),
    Runtime.Tuple([Runtime.Ref('Property')]),
    Runtime.Tuple([])
], values => (values.length === 3 ? { ...values[0], ...values[2] } :
    values.length === 2 ? values[0] :
        values.length === 1 ? values[0] :
            {}));
// ------------------------------------------------------------------
// Object
// ------------------------------------------------------------------
// prettier-ignore
const ObjectMapping = (_0, Properties, _2) => Types.Object(Properties);
// prettier-ignore
const _Object = Runtime.Tuple([
    Runtime.Const(LBrace),
    Runtime.Ref('Properties'),
    Runtime.Const(RBrace)
], values => ObjectMapping(...values));
// ------------------------------------------------------------------
// Tuple
// ------------------------------------------------------------------
// prettier-ignore
const Elements = Runtime.Union([
    Runtime.Tuple([Runtime.Ref('Type'), Runtime.Const(Comma), Runtime.Ref('Elements')]),
    Runtime.Tuple([Runtime.Ref('Type'), Runtime.Const(Comma)]),
    Runtime.Tuple([Runtime.Ref('Type')]),
    Runtime.Tuple([]),
], value => (value.length === 3 ? [value[0], ...value[2]] :
    value.length === 2 ? [value[0]] :
        value.length === 1 ? [value[0]] :
            []));
// prettier-ignore
const Tuple = Runtime.Tuple([
    Runtime.Const(LBracket),
    Runtime.Ref('Elements'),
    Runtime.Const(RBracket)
], value => Types.Tuple(value[1]));
// ------------------------------------------------------------------
// Parameters
// ------------------------------------------------------------------
// prettier-ignore
const Parameter = Runtime.Tuple([
    Runtime.Ident(), Runtime.Const(Colon), Runtime.Ref('Type')
], value => value[2]);
// prettier-ignore
const Parameters = Runtime.Union([
    Runtime.Tuple([Runtime.Ref('Parameter'), Runtime.Const(Comma), Runtime.Ref('Parameters')]),
    Runtime.Tuple([Runtime.Ref('Parameter'), Runtime.Const(Comma)]),
    Runtime.Tuple([Runtime.Ref('Parameter')]),
    Runtime.Tuple([]),
], value => (value.length === 3 ? [value[0], ...value[2]] :
    value.length === 2 ? [value[0]] :
        value.length === 1 ? [value[0]] :
            []));
// ------------------------------------------------------------------
// Constructor
// ------------------------------------------------------------------
// prettier-ignore
const Constructor = Runtime.Tuple([
    Runtime.Const('new'),
    Runtime.Const(LParen),
    Runtime.Ref('Parameters'),
    Runtime.Const(RParen),
    Runtime.Const('=>'),
    Runtime.Ref('Type')
], value => Types.Constructor(value[2], value[5]));
// ------------------------------------------------------------------
// Function
// ------------------------------------------------------------------
// prettier-ignore
const Function = Runtime.Tuple([
    Runtime.Const(LParen),
    Runtime.Ref('Parameters'),
    Runtime.Const(RParen),
    Runtime.Const('=>'),
    Runtime.Ref('Type')
], value => Types.Function(value[1], value[4]));
// ------------------------------------------------------------------
// Mapped (requires deferred types)
// ------------------------------------------------------------------
// prettier-ignore
const MappedMapping = (values) => {
    return Types.Literal('Mapped types not supported');
};
// prettier-ignore
const Mapped = Runtime.Tuple([
    Runtime.Const(LBrace),
    Runtime.Const(LBracket),
    Runtime.Ident(),
    Runtime.Const('in'),
    Runtime.Ref('Type'),
    Runtime.Const(RBracket),
    Runtime.Const(Colon),
    Runtime.Ref('Type'),
    Runtime.Const(RBrace)
], MappedMapping);
// ------------------------------------------------------------------
// AsyncIterator
// ------------------------------------------------------------------
// prettier-ignore
const AsyncIterator = Runtime.Tuple([
    Runtime.Const('AsyncIterator'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.AsyncIterator(value[2]));
// ------------------------------------------------------------------
// Iterator
// ------------------------------------------------------------------
// prettier-ignore
const Iterator = Runtime.Tuple([
    Runtime.Const('Iterator'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Iterator(value[2]));
// ------------------------------------------------------------------
// ConstructorParameters
// ------------------------------------------------------------------
// prettier-ignore
const ConstructorParameters = Runtime.Tuple([
    Runtime.Const('ConstructorParameters'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.ConstructorParameters(value[2]));
// ------------------------------------------------------------------
// Parameters
// ------------------------------------------------------------------
// prettier-ignore
const FunctionParameters = Runtime.Tuple([
    Runtime.Const('Parameters'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Parameters(value[2]));
// ------------------------------------------------------------------
// InstanceType
// ------------------------------------------------------------------
// prettier-ignore
const InstanceType = Runtime.Tuple([
    Runtime.Const('InstanceType'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.InstanceType(value[2]));
// ------------------------------------------------------------------
// ReturnType
// ------------------------------------------------------------------
// prettier-ignore
const ReturnType = Runtime.Tuple([
    Runtime.Const('ReturnType'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.ReturnType(value[2]));
// ------------------------------------------------------------------
// Awaited
// ------------------------------------------------------------------
// prettier-ignore
const Awaited = Runtime.Tuple([
    Runtime.Const('Awaited'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Awaited(value[2]));
// ------------------------------------------------------------------
// Array
// ------------------------------------------------------------------
// prettier-ignore
const Array = Runtime.Tuple([
    Runtime.Const('Array'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Array(value[2]));
// ------------------------------------------------------------------
// Record
// ------------------------------------------------------------------
// prettier-ignore
const Record = Runtime.Tuple([
    Runtime.Const('Record'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(Comma),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Record(value[2], value[4]));
// ------------------------------------------------------------------
// Promise
// ------------------------------------------------------------------
// prettier-ignore
const Promise = Runtime.Tuple([
    Runtime.Const('Promise'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Promise(value[2]));
// ------------------------------------------------------------------
// Partial
// ------------------------------------------------------------------
// prettier-ignore
const Partial = Runtime.Tuple([
    Runtime.Const('Partial'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Partial(value[2]));
// ------------------------------------------------------------------
// Required
// ------------------------------------------------------------------
// prettier-ignore
const Required = Runtime.Tuple([
    Runtime.Const('Required'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Required(value[2]));
// ------------------------------------------------------------------
// Pick
// ------------------------------------------------------------------
// prettier-ignore
const Pick = Runtime.Tuple([
    Runtime.Const('Pick'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(Comma),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Pick(value[2], value[4]));
// ------------------------------------------------------------------
// Omit
// ------------------------------------------------------------------
// prettier-ignore
const Omit = Runtime.Tuple([
    Runtime.Const('Omit'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(Comma),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Omit(value[2], value[4]));
// ------------------------------------------------------------------
// Exclude
// ------------------------------------------------------------------
// prettier-ignore
const Exclude = Runtime.Tuple([
    Runtime.Const('Exclude'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(Comma),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Exclude(value[2], value[4]));
// ------------------------------------------------------------------
// Extract
// ------------------------------------------------------------------
// prettier-ignore
const Extract = Runtime.Tuple([
    Runtime.Const('Extract'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(Comma),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Extract(value[2], value[4]));
// ------------------------------------------------------------------
// Uppercase
// ------------------------------------------------------------------
// prettier-ignore
const Uppercase = Runtime.Tuple([
    Runtime.Const('Uppercase'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Uppercase(value[2]));
// ------------------------------------------------------------------
// Lowercase
// ------------------------------------------------------------------
// prettier-ignore
const Lowercase = Runtime.Tuple([
    Runtime.Const('Lowercase'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Lowercase(value[2]));
// ------------------------------------------------------------------
// Capitalize
// ------------------------------------------------------------------
// prettier-ignore
const Capitalize = Runtime.Tuple([
    Runtime.Const('Capitalize'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Capitalize(value[2]));
// ------------------------------------------------------------------
// Uncapitalize
// ------------------------------------------------------------------
// prettier-ignore
const Uncapitalize = Runtime.Tuple([
    Runtime.Const('Uncapitalize'),
    Runtime.Const(LAngle),
    Runtime.Ref('Type'),
    Runtime.Const(RAngle),
], value => Types.Uncapitalize(value[2]));
// ------------------------------------------------------------------
// Date
// ------------------------------------------------------------------
const Date = Runtime.Const('Date', Runtime.As(Types.Date()));
// ------------------------------------------------------------------
// Uint8Array
// ------------------------------------------------------------------
const Uint8Array = Runtime.Const('Uint8Array', Runtime.As(Types.Uint8Array()));
// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
// prettier-ignore
const Main = Runtime.Union([
    ModuleDeclaration,
    TypeAliasDeclaration,
    InterfaceDeclaration,
    Type
]);
// ------------------------------------------------------------------
// Module
// ------------------------------------------------------------------
// prettier-ignore
export const Module = new Runtime.Module({
    // ----------------------------------------------------------------
    // Modules, Interfaces and Type Aliases
    // ----------------------------------------------------------------
    ExportModifier,
    HeritageList,
    Heritage,
    InterfaceDeclaration,
    TypeAliasDeclaration,
    ModuleType,
    ModuleProperties,
    ModuleDeclaration,
    // ----------------------------------------------------------------
    // Type Expressions
    // ----------------------------------------------------------------
    Literal,
    Keyword,
    KeyOf,
    IndexArray,
    Extends,
    Base,
    Factor,
    ExprTermTail,
    ExprTerm,
    ExprTail,
    Expr,
    Type, // Alias for Expr
    PropertyKey,
    Readonly,
    Optional,
    Property,
    PropertyDelimiter,
    Properties,
    Object: _Object,
    Elements,
    Tuple,
    Parameter,
    Function,
    Parameters,
    Constructor,
    Mapped,
    AsyncIterator,
    Iterator,
    Awaited,
    Array,
    Record,
    Promise,
    ConstructorParameters,
    FunctionParameters,
    InstanceType,
    ReturnType,
    Partial,
    Required,
    Pick,
    Omit,
    Exclude,
    Extract,
    Uppercase,
    Lowercase,
    Capitalize,
    Uncapitalize,
    Date,
    Uint8Array,
    Reference,
    // ----------------------------------------------------------------
    // Main
    // ----------------------------------------------------------------
    Main
});
