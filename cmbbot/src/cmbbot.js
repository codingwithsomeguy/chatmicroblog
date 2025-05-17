// Copyright 2023 Nixiesoft LLC
// see LICENSE.md

require("dotenv").config({debug: true, path: "../../.env"});

const fs = require("fs");
const winston = require("winston");
const bolt = require("@slack/bolt");
const axios = require("axios");
const jose = require("jose");

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));

const authEmoji = config.approvedemojinames;
const authedUsers = Object.keys(config.approvers);

const logger = (function () {
    return winston.createLogger({
        level: "info",
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
        ),
        defaultMeta: {service: "cmbbot"},
        transports: [
            new winston.transports.File({
                filename: "cmbbot.log",
                // level: "error",
            }),
            new winston.transports.Console({
                format: winston.format.simple(),
            }),
        ],
    });
})();

const app = new bolt.App({
    token: process.env.CMB_SLACK_TOKEN,
    signingSecret: process.env.CMB_SLACK_SIGNINGSECRET,
    appToken: process.env.CMB_SLACK_APPTOKEN,
    socketMode: true,
});

async function getPublicKey() {
    return jose.importSPKI(process.env.CMB_WEBAPI_PUB);
}

async function downloadImageUrl(url) {
    logger.info("downloadImageUrl:", url);
    return axios.get(url, {
        headers: {Authorization: `Bearer ${process.env.CMB_SLACK_TOKEN}`},
        responseType: "arraybuffer",
    }).then(response => response.data).
    catch(async err => {
        logger.debug("downloadImageUrl: get error");;
        return null;
    });
}

async function publishStory(say, authorUserId, authorUserName, threadTs, storyLines, imgAttachment) {
    logger.debug("publishStory:", storyLines);
    const allowedImageTypes = ["png", "jpeg", "jpg"];
    logger.debug("imgAttachment: mime:", imgAttachment.mimetype, imgAttachment.filetype);
    if (allowedImageTypes.includes(imgAttachment.filetype.toLowerCase()) === false) {
        await say({
            text: `only ${allowedImageTypes} accepted at the moment`,
            thread_ts: threadTs,
        });
        return;
    }

    if (storyLines.length < 2) {
        await say({
            text: "not enough lines",
            thread_ts: threadTs,
        });
        return;
    }

    const imageUrl = imgAttachment.url_private;
    await say({
        text: "downloading image...",
        thread_ts: threadTs,
    });
    const imgBinData = await downloadImageUrl(imageUrl);
    if (imgBinData === null) {
        logger.error("downloadImageUrl failed");
        await say({
            text: `Problem downloading image`,
            thread_ts: threadTs,
        });
        return;
    }
    const storyData = {
        authorid: authorUserId,
        authorname: authorUserName,
        title: storyLines[0],
        story: storyLines.slice(1).join("\n"),
        imagedata: imgBinData.toString("base64"),
        imagemimetype: imgAttachment.mimetype,
        imagename: imgAttachment.name,
    };
    await say({
        text: "posting to the website...",
        thread_ts: threadTs,
    });

    const jwe = await new jose.CompactEncrypt(
        new TextEncoder().encode(
            process.env.CMB_WEBAPI_EPSK + Math.random()),
    ).setProtectedHeader({alg: "RSA-OAEP-256", enc: "A256GCM"})
        .encrypt(await getPublicKey());

    axios.post(config.webcmbaddurl, storyData, {
        headers: {
            "User-Agent": "cmbbot 0.0.1",
            Authorization: jwe,
        },
    }).then(async response => {
        await say({
            text: `Your story was published! (rpc:${response.status})`,
            thread_ts: threadTs,
        });
    }).catch(async err => {
        logger.debug("post error:", err.data);
        await say({
            text: `Story didn't publish, post response: ${err.message}`,
            thread_ts: threadTs,
        });
    });
}

async function getMessageWithReaction(event, client) {
    const conversationHistory = await client.conversations.history({
        channel: event.item.channel,
        latest: event.item.ts,
        inclusive: true,
        limit: 1,
    });
    const result = conversationHistory.messages[0];
    // requires scope users:read
    const conversationUser = await client.users.info({
        user: conversationHistory.messages[0].user,
    });
    if (conversationUser.ok === true && conversationUser.user.real_name !== undefined) {
        result.userName = conversationUser.user.real_name.trim();
    }

    return conversationHistory.messages[0];
}

function meetsStoryCriteria(message, say, threadTs, authUserId) {
    let result = false;
    let needToSay;

    if (authedUsers.includes(authUserId) === true) {
        const messageText = message.text.trim();

        if (messageText.indexOf("\n") > 0) {
            if (message.files !== undefined && message.files.length > 0) {
                result = true;
            } else {
                needToSay = "please add an image (<1MB png)";
                result = false;
            }
        } else {
            needToSay = "need a title line and a story at minimum";
            result = false;
        }
    } else {
        logger.debug(`ignoring unauthorized user[${authUserId}] on story`);
    }

    if (needToSay !== undefined) {
        say({
            text: needToSay,
            thread_ts: threadTs,
        });
    }

    // silently ignore missing auth reactions and other cases
    return result;
}

// TODO: watch for ordering / double approvals (from unauth and auth in particular)
app.event("reaction_added", async ({event, client, say}) => {
    logger.info("reaction_added");
    if (authEmoji.includes(event.reaction) === true) {
        logger.debug("auth emoji: reaction_added", event);
        try {
            const reactedMessage = await getMessageWithReaction(event, client);
            if (meetsStoryCriteria(reactedMessage, say, reactedMessage.ts, event.user) === true) {
                const messageLines = reactedMessage.text.trim().split("\n");

                publishStory(say, reactedMessage.user, reactedMessage.userName, reactedMessage.ts, messageLines, reactedMessage.files[0]);
            }
        } catch (e) {
            console.error("err:", e);
        }
    }
});

/* app.message("ping", async ({event, say}) => {
    // await say("pong");
    await say({
        text: "pong",
        thread_ts: event.ts,
    });
}); */

(async () => {
    await app.start();

    logger.info("running in websocket mode");
})();
