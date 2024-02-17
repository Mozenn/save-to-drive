/**
 * Load or request or authorization to call APIs.
 *
 */
export declare function authorize(): Promise<import("google-auth-library").BaseExternalAccountClient | import("google-auth-library/build/src/auth/externalAccountAuthorizedUserClient.js").ExternalAccountAuthorizedUserClient | import("google-auth-library").OAuth2Client>;
/**
 * Renew auth token when invalid
 *
 */
export declare function renewAuth(): Promise<void>;
//# sourceMappingURL=auth.d.ts.map