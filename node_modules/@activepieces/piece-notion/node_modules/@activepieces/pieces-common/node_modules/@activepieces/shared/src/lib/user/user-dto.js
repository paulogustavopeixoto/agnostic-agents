"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResponse = void 0;
const typebox_1 = require("@sinclair/typebox");
const user_1 = require("./user");
exports.UserResponse = typebox_1.Type.Omit(user_1.User, ['password']);
//# sourceMappingURL=user-dto.js.map