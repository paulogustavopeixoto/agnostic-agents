"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PieceAuth = exports.PieceAuthProperty = void 0;
const typebox_1 = require("@sinclair/typebox");
const basic_auth_prop_1 = require("./basic-auth-prop");
const custom_auth_prop_1 = require("./custom-auth-prop");
const secret_text_property_1 = require("./secret-text-property");
const property_type_1 = require("../input/property-type");
const oauth2_prop_1 = require("./oauth2-prop");
exports.PieceAuthProperty = typebox_1.Type.Union([
    basic_auth_prop_1.BasicAuthProperty,
    custom_auth_prop_1.CustomAuthProperty,
    oauth2_prop_1.OAuth2Property,
    secret_text_property_1.SecretTextProperty,
]);
exports.PieceAuth = {
    SecretText(request) {
        return Object.assign(Object.assign({}, request), { valueSchema: undefined, type: property_type_1.PropertyType.SECRET_TEXT, required: true });
    },
    OAuth2(request) {
        return Object.assign(Object.assign({}, request), { valueSchema: undefined, type: property_type_1.PropertyType.OAUTH2, displayName: 'Connection' });
    },
    BasicAuth(request) {
        return Object.assign(Object.assign({}, request), { valueSchema: undefined, type: property_type_1.PropertyType.BASIC_AUTH, displayName: 'Connection', required: true });
    },
    CustomAuth(request) {
        return Object.assign(Object.assign({}, request), { valueSchema: undefined, type: property_type_1.PropertyType.CUSTOM_AUTH, displayName: 'Connection' });
    },
    None() {
        return undefined;
    },
};
//# sourceMappingURL=index.js.map