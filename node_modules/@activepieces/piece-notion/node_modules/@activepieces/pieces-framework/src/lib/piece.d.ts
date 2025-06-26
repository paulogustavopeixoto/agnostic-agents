import { Trigger } from './trigger/trigger';
import { Action } from './action/action';
import { EventPayload, ParseEventResponse, PieceCategory } from '@activepieces/shared';
import { PieceBase, PieceMetadata } from './piece-metadata';
import { PieceAuthProperty } from './property/authentication';
export declare class Piece<PieceAuth extends PieceAuthProperty = PieceAuthProperty> implements Omit<PieceBase, 'version' | 'name'> {
    readonly displayName: string;
    readonly logoUrl: string;
    readonly authors: string[];
    readonly events: PieceEventProcessors | undefined;
    readonly categories: PieceCategory[];
    readonly auth?: PieceAuth | undefined;
    readonly minimumSupportedRelease?: string | undefined;
    readonly maximumSupportedRelease?: string | undefined;
    readonly description: string;
    private readonly _actions;
    private readonly _triggers;
    constructor(displayName: string, logoUrl: string, authors: string[], events: PieceEventProcessors | undefined, actions: Action<PieceAuth>[], triggers: Trigger<PieceAuth>[], categories: PieceCategory[], auth?: PieceAuth | undefined, minimumSupportedRelease?: string | undefined, maximumSupportedRelease?: string | undefined, description?: string);
    metadata(): BackwardCompatiblePieceMetadata;
    getAction(actionName: string): Action | undefined;
    getTrigger(triggerName: string): Trigger | undefined;
    actions(): Record<string, Action>;
    triggers(): Record<string, Trigger>;
}
export declare const createPiece: <PieceAuth extends PieceAuthProperty>(params: CreatePieceParams<PieceAuth>) => Piece<PieceAuth>;
type CreatePieceParams<PieceAuth extends PieceAuthProperty = PieceAuthProperty> = {
    displayName: string;
    logoUrl: string;
    authors: string[];
    description?: string;
    auth: PieceAuth | undefined;
    events?: PieceEventProcessors;
    minimumSupportedRelease?: string;
    maximumSupportedRelease?: string;
    actions: Action<PieceAuth>[];
    triggers: Trigger<PieceAuth>[];
    categories?: PieceCategory[];
};
type PieceEventProcessors = {
    parseAndReply: (ctx: {
        payload: EventPayload;
    }) => ParseEventResponse;
    verify: (ctx: {
        webhookSecret: string;
        payload: EventPayload;
        appWebhookUrl: string;
    }) => boolean;
};
type BackwardCompatiblePieceMetadata = Omit<PieceMetadata, 'name' | 'version' | 'authors'> & {
    authors?: PieceMetadata['authors'];
};
export {};
