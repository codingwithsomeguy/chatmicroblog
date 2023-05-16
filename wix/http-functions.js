/*
Copyright 2023 Nixiesoft LLC
see LICENSE.md

velo / wix api info:
https://www.wix.com/velo/reference/wix-http-functions
https://support.wix.com/en/article/velo-exposing-a-site-api-with-http-functions

deployment URLs:
https://somecodingguy.wixsite.com/testdynsite2/_functions/cmbstory?title=the+thing&story=we+built+the+thing&imagealt=alt+text
https://somecodingguy.wixsite.com/testdynsite2/_functions-dev/cmblist

*/

// created is defined in wix-http-functions
import {ok, badRequest} from "wix-http-functions";
import wixData from "wix-data";
import {mediaManager} from "wix-media-backend";
import {getSecret} from "wix-secrets-backend";
// the jose version is quite old, use this style import (catch the default export):
import compactDecrypt from "jose/jwe/compact/decrypt";
import parseJwk from "jose/jwk/parse";

const CMB_COLLECTION_KEY = "chatMicroBlog";
const CMB_UPLOAD_FOLDER = "/cmbUploads";

// eslint-disable-next-line camelcase
export async function post_cmbadd(request) {
    // pkcs8 key decoding isn't available in the old jose, reencoded as JWK
    // const privKey = await importPKCS8(await getSecret("CMB_JWK"), "RSA-OAEP-256");
    const privKey = await parseJwk(JSON.parse(await getSecret("CMB_JWK")), "RSA-OAEP-256");
    const epsk = await getSecret("CMB_EPSK");
    let isValidRequest = true; // TODO: flip this logic

    const response = {
        headers: {
            "Content-Type": "application/json",
        },
    };

    // light security, but likely matches the requirements / time
    try {
        const authResult = await compactDecrypt(request.headers.authorization, privKey);
        const decodedText = Buffer.from(authResult.plaintext.buffer).toString("utf-8");
        if (decodedText.startsWith(epsk) !== true) {
            isValidRequest = false;
        }
    } catch (authError) {
        console.log("failed auth (expected)", authError);
        isValidRequest = false;
    }

    if (isValidRequest === false) {
        response.body = {status: "bad", err: "nsvi"};
        return badRequest(response);
    }

    return request.body.json()
        .then(body =>
        // body.imagedata is base64ed
        // console.log("cmbadd post: data", body.title, "story", body.story, "imglen", body.imagedata.length, "imgst", body.imagedata.slice(0, 5), "type", body.imagemimetype);

            // TODO: error detection on params
            Promise.all([
                mediaManager.upload(
                    CMB_UPLOAD_FOLDER,
                    Buffer.from(body.imagedata, "base64"),
                    body.imagename,
                    {
                        mediaOptions: {
                            mimeType: body.imagemimetype,
                            mediaType: "image",
                        },
                        metadataOptions: {
                            isPrivate: false,
                            isVisitorUpload: false,
                            context: {
                                someKey1: "someValue1",
                                someKey2: "someValue2",
                            },
                        },
                    },
                ),
                Promise.resolve(body),
            ]),
        )
        .then(([mediaUpload, reqBody]) => {
            // console.log("cmbadd: inserting collection record");
            console.log("second then, reqBody: ", reqBody);
            return wixData.insert(CMB_COLLECTION_KEY, {
                title: reqBody.title,
                story: reqBody.story,
                imagealt: reqBody.title,
                image: mediaUpload.fileUrl,
                authorid: reqBody.authorid,
                // TODO: remove this when normalizing the author table
                authorname: reqBody.authorname,
            });
        })
        .then(item => {
            console.log("cmbadd: added", item);
            response.body = {didwork: true, added: item};
            // return created();
            return ok(response);
        })
        .catch(err => {
            response.body = {status: "bad", err};
            return badRequest(response);
        });
}

/*
// Example of enumerating the stories from the collection:
// eslint-disable-next-line camelcase
export function get_cmblist(_request) {
    const response = {
        headers: {
            "Content-Type": "application/json",
        },
    };
    return wixData.query(CMB_COLLECTION_KEY).find().then(results => {
        response.body = {items: results.items};
        return ok(response);
    }).catch(err => {
        response.body = {
            error: err,
        };
        return badRequest(response);
    });
} */
