"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFlowRequest = void 0;
const typebox_1 = require("@sinclair/typebox");
exports.CreateFlowRequest = typebox_1.Type.Object({
    displayName: typebox_1.Type.String({}),
    folderName: typebox_1.Type.Optional(typebox_1.Type.String({})),
    projectId: typebox_1.Type.String({}),
});
//# sourceMappingURL=create-flow-request.js.map