export declare const githubCreateIssueAction: import("@activepieces/pieces-framework").IAction<import("@activepieces/pieces-framework").OAuth2Property<import("@activepieces/pieces-framework").OAuth2Props>, {
    repository: import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, false> | import("@activepieces/pieces-framework").DropdownProperty<{
        repo: string;
        owner: string;
    }, true>;
    title: import("@activepieces/pieces-framework").ShortTextProperty<true>;
    description: import("@activepieces/pieces-framework").LongTextProperty<false>;
    labels: import("@activepieces/pieces-framework").MultiSelectDropdownProperty<string, false> | import("@activepieces/pieces-framework").MultiSelectDropdownProperty<string, true>;
    assignees: import("@activepieces/pieces-framework").MultiSelectDropdownProperty<string, false> | import("@activepieces/pieces-framework").MultiSelectDropdownProperty<string, true>;
}>;
