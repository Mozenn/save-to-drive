import { Credentials } from "google-auth-library";
/**
 * Get an auth token using oauth2 flow, and return the credentials
 *
 */
export declare function getAuthTokens(): Promise<Credentials>;
/**
 * Get an oauth2 client with the given credentials
 *
 */
export declare function getOAuth2Client(credentials: Credentials): Promise<import("google-auth-library").OAuth2Client>;
/**
 * Renew auth token when invalid
 *
 */
//# sourceMappingURL=auth.d.ts.map