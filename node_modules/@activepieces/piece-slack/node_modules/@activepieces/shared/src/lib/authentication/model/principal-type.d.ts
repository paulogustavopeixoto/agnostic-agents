export declare enum PrincipalType {
    USER = "USER",
    ENGINE = "ENGINE",
    SERVICE = "SERVICE",
    WORKER = "WORKER",
    UNKNOWN = "UNKNOWN",
    /**
     * @deprecated
     */
    SUPER_USER = "SUPER_USER"
}
export declare const ALL_PRINCIPAL_TYPES: PrincipalType[];
export declare const SERVICE_KEY_SECURITY_OPENAPI: {
    apiKey: never[];
};
export declare enum EndpointScope {
    PLATFORM = "PLATFORM",
    PROJECT = "PROJECT"
}
