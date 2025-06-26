"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPiece = exports.Piece = void 0;
class Piece {
    constructor(displayName, logoUrl, authors, events, actions, triggers, categories, auth, minimumSupportedRelease, maximumSupportedRelease, description = '') {
        this.displayName = displayName;
        this.logoUrl = logoUrl;
        this.authors = authors;
        this.events = events;
        this.categories = categories;
        this.auth = auth;
        this.minimumSupportedRelease = minimumSupportedRelease;
        this.maximumSupportedRelease = maximumSupportedRelease;
        this.description = description;
        this._actions = {};
        this._triggers = {};
        actions.forEach((action) => (this._actions[action.name] = action));
        triggers.forEach((trigger) => (this._triggers[trigger.name] = trigger));
    }
    metadata() {
        return {
            displayName: this.displayName,
            logoUrl: this.logoUrl,
            actions: this._actions,
            triggers: this._triggers,
            categories: this.categories,
            description: this.description,
            authors: this.authors,
            auth: this.auth,
            minimumSupportedRelease: this.minimumSupportedRelease,
            maximumSupportedRelease: this.maximumSupportedRelease,
        };
    }
    getAction(actionName) {
        return this._actions[actionName];
    }
    getTrigger(triggerName) {
        return this._triggers[triggerName];
    }
    actions() {
        return this._actions;
    }
    triggers() {
        return this._triggers;
    }
}
exports.Piece = Piece;
const createPiece = (params) => {
    var _a, _b, _c;
    return new Piece(params.displayName, params.logoUrl, (_a = params.authors) !== null && _a !== void 0 ? _a : [], params.events, params.actions, params.triggers, (_b = params.categories) !== null && _b !== void 0 ? _b : [], (_c = params.auth) !== null && _c !== void 0 ? _c : undefined, params.minimumSupportedRelease, params.maximumSupportedRelease, params.description);
};
exports.createPiece = createPiece;
//# sourceMappingURL=piece.js.map