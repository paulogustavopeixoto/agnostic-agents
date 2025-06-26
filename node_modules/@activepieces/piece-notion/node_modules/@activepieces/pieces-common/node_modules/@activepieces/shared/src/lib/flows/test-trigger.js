"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTriggerRequestBody = exports.TriggerTestStrategy = void 0;
const typebox_1 = require("@sinclair/typebox");
const id_generator_1 = require("../common/id-generator");
var TriggerTestStrategy;
(function (TriggerTestStrategy) {
    TriggerTestStrategy["SIMULATION"] = "SIMULATION";
    TriggerTestStrategy["TEST_FUNCTION"] = "TEST_FUNCTION";
})(TriggerTestStrategy || (exports.TriggerTestStrategy = TriggerTestStrategy = {}));
exports.TestTriggerRequestBody = typebox_1.Type.Object({
    flowId: id_generator_1.ApId,
    flowVersionId: id_generator_1.ApId,
    testStrategy: typebox_1.Type.Enum(TriggerTestStrategy),
});
//# sourceMappingURL=test-trigger.js.map