import express from "express";
import morgan from "morgan";
import {fileURLToPath} from "node:url";
import path from "node:path";
import fetch from "node-fetch";

const port = process.env.PORT || 1337;

/*
 * appKey: The client identification of your app, supplied by Saxo (Client ID)
 * clientSecret: The secret which gives access to the API (Client Secret)
 * tokenEndpoint: The URL of the authentication provider (https://www.developer.saxo/openapi/learn/environments)
 *
 * IMPORTANT NOTICE:
 * The following credentials give access to SIM, if the redirect URL is http://localhost:1337/ (NodeJs example) and
 * http://localhost/openapi-samples-js/authentication/oauth2-code-flow/redirect/ (PHP example).
 * If you want to use your own redirect URL, you must create your own Code Flow application:
 * https://www.developer.saxo/openapi/appmanagement.
 * And needless to say, when you have an app for Live, be sure you don't publish the credentials on Github!
 *
 */
const configurationObject = {
    "appKey": "ac4904e1dd514e72b4379c756ece06c5",
    "appSecret": "bbd0873c920746e290eee697380c9724",
    "tokenEndpoint": "https://sim.logonvalidation.net/token"
};

function apiHandler(request, response) {
    const query = request.body;
    console.log(query);
    function sendResponse(httpStatusCode, responseObject) {
        const responseBody = JSON.stringify(responseObject);
        // Tempting, but don't log outgoing data, because this is sensitive information!
        response.writeHead(httpStatusCode, {"Content-Type": "application/json"});
        response.end(responseBody);
    }

    function returnError(httpStatusCode, errorCode, errorMessage) {
        const responseObject = {
            "Message": errorMessage,
            "ErrorCode": errorCode
        };
        console.error(errorMessage);
        sendResponse(httpStatusCode, responseObject);
    }

    function requestToken() {
        console.log("Query:", query);
        const data = new URLSearchParams();
        // Tempting, but don't log incoming data, because this is sensitive information!
        data.append("client_id", configurationObject.appKey);
        data.append("client_secret", configurationObject.appSecret);
        data.append("redirect_uri", configurationObject.redirectUri)
        if (query.code) {
            data.append("grant_type", "authorization_code");
            data.append("code", query.code);
        } else if (query.refresh_token) {
            data.append("grant_type", "refresh_token");
            data.append("refresh_token", query.refresh_token);
        } else {
            returnError(400, "BadRequest", "Invalid query parameters");
            return;
        }
        fetch(
            configurationObject.tokenEndpoint,
            {
                "method": "POST",
                "body": data
            }
        ).then(function (tokenResponse) {
            if (tokenResponse.ok) {
                tokenResponse.json().then(function (tokenResponseJson) {
                    sendResponse(200, tokenResponseJson);
                });
            } else {
                returnError(tokenResponse.status, "Unauthorized", tokenResponse.statusText);
            }
        }).catch(function (error) {
            returnError(401, "Unauthorized", error);
        });
    }

    requestToken();
}

// Start Express server
const server = express();
server.use(morgan("combined"));  // The request logger
server.use(express.json());
// The redirect web page runs on http://localhost:1337/index.html
const staticPage = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
console.log(staticPage);
server.use(express.static(staticPage));
// The backend is available for POST on http://localhost:1337/server
server.post("/server", apiHandler);
server.listen(port);

console.log("Server listening on port %j", port);

// Handle stop signals
function handleExit() {
    process.exit(0);
}

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
