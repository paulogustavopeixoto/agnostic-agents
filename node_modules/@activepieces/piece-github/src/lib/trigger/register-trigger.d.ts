import { TriggerStrategy } from '@activepieces/pieces-framework';
export declare const githubRegisterTrigger: ({ name, displayName, description, sampleData, }: {
    name: string;
    displayName: string;
    description: string;
    sampleData: object;
}) => import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.WEBHOOK, import("@activepieces/pieces-framework").OAuth2Property<import("@activepieces/pieces-framework").OAuth2Props>, {
    repository: import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, false> | import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, true>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.POLLING, import("@activepieces/pieces-framework").OAuth2Property<import("@activepieces/pieces-framework").OAuth2Props>, {
    repository: import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, false> | import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, true>;
}> | import("@activepieces/pieces-framework").ITrigger<TriggerStrategy.APP_WEBHOOK, import("@activepieces/pieces-framework").OAuth2Property<import("@activepieces/pieces-framework").OAuth2Props>, {
    repository: import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, false> | import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, true>;
}>;
