"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecuteCodeRequest = void 0;
const typebox_1 = require("@sinclair/typebox");
exports.ExecuteCodeRequest = typebox_1.Type.Object({
    artifact: typebox_1.Type.String(),
    input: typebox_1.Type.Object({}),
});
//# sourceMappingURL=code-request.js.map