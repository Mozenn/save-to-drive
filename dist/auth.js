import { google } from "googleapis";
import chalk from "chalk";
import * as http from "http";
import open from "open";
import * as url from "url";
const SCOPES = ["https://www.googleapis.com/auth/drive"];
/**
 * Get an auth token using oauth2 flow, and return the credentials
 *
 */
export async function getAuthTokens(app, debug) {
    const { oauth2Client, redirectUri } = createOAuth2Client();
    if (debug) {
        console.log(chalk.white.bold("oauth2Client created with redirectUri: " + redirectUri));
    }
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES.join(' '),
    });
    if (debug) {
        console.log(chalk.white.bold("authorizeUrl generated: " + authorizeUrl));
    }
    const redirectUrl = new url.URL(redirectUri);
    const server = http
        .createServer(async (req, res) => {
        try {
            if (debug) {
                console.log(chalk.white.bold("request received: " + req.url));
            }
            const redirectUriLastSegment = redirectUri.split('/').slice(-1)[0];
            if (req.url && req.url.indexOf(`/${redirectUriLastSegment}`) > -1) {
                const redirectUriBase = redirectUrl.protocol + '//' + redirectUrl.host;
                const qs = new url.URL(req.url, redirectUriBase)
                    .searchParams;
                res.end('Authentication successful! Please return to the console.');
                const { tokens } = await oauth2Client.getToken(qs.get('code') || '');
                if (debug) {
                    console.log(chalk.white.bold("token: " + JSON.stringify(tokens)));
                }
                oauth2Client.setCredentials(tokens);
                server.emit('token');
            }
        }
        catch (e) {
            console.log(chalk.red.bold("error during processing request: " + JSON.stringify(e)));
        }
    })
        .listen(Number(redirectUrl.port), async () => {
        if (debug) {
            console.log(chalk.white.bold("server started, listening on port " + redirectUrl.port));
        }
    });
    if (debug) {
        console.log(chalk.white.bold("opening auth URL in browser: " + authorizeUrl));
    }
    await open(authorizeUrl, { app: app, wait: true });
    if (oauth2Client.credentials && Object.keys(oauth2Client.credentials).length > 0) {
        server.close();
    }
    else {
        await new Promise((resolve) => {
            if (debug) {
                console.log(chalk.white.bold("waiting for token..."));
            }
            server.on('token', () => {
                server.close();
                if (debug) {
                    console.log(chalk.white.bold("server closed"));
                }
                resolve();
            });
        });
    }
    if (debug) {
        console.log(chalk.white.bold("oauth2Client creds" + JSON.stringify(oauth2Client.credentials)));
    }
    return oauth2Client.credentials;
}
/**
 * Get an oauth2 client with the given credentials
 *
 */
export async function getOAuth2Client(credentials) {
    const { oauth2Client } = createOAuth2Client();
    oauth2Client.setCredentials(credentials);
    return oauth2Client;
}
function createOAuth2Client() {
    const redirectUri = process.env.STD_REDIRECT_URI || "http://localhost:3000/callback";
    const oauth2Client = new google.auth.OAuth2({ clientId: process.env.STD_CLIENT_ID, clientSecret: process.env.STD_CLIENT_SECRET, redirectUri });
    return { oauth2Client, redirectUri };
}
//# sourceMappingURL=auth.js.map