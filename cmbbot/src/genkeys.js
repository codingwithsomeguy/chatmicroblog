const jose = require("jose");
// const fs = require("fs");

async function genKeyPair() {
    // const key = await jose.generateKeyPair("PS256");
    const key = await jose.generateKeyPair("RSA-OAEP-256");
    const pubKey = await jose.exportSPKI(key.publicKey);
    // const privKey = await jose.exportPKCS8(key.privateKey);
    const privKeyJWK = JSON.stringify(await jose.exportJWK(key.privateKey));

    console.log("pub key:\n" + pubKey.split("\n").join(""));
    // console.log("priv key:\n" + privKey.split("\n").join(""));
    console.log("priv key JWK", privKeyJWK);
    // fs.writeFileSync("key.json", privKeyJWK);

    // const jwe = await new jose.CompactEncrypt(
    //    new TextEncoder().encode("standalone pub key encrypt test"),
    // ).setProtectedHeader({alg: "RSA-OAEP-256", enc: "A256GCM"})
    //    .encrypt(key.publicKey);

    // fs.writeFileSync("out.txt", jwe);
}

/* async function standaloneTest() {
    // const key = await jose.generateKeyPair("PS256");
    const key = await jose.generateKeyPair("RSA-OAEP-256");

    // console.log("pub key:", await jose.exportSPKI(key.publicKey));
    // console.log("priv key:", await jose.exportPKCS8(key.privateKey));

    const jwe = await new jose.CompactEncrypt(
        new TextEncoder().encode("some stuff"),
    ).setProtectedHeader({alg: "RSA-OAEP-256", enc: "A256GCM"})
        .encrypt(key.publicKey);

    console.log("enc:", jwe);

    const result = await jose.compactDecrypt(jwe, key.privateKey);
    console.log("header:", result.protectedHeader);
    console.log("text:", new TextDecoder().decode(result.plaintext));
} */

/* async function testDecrypt() {
    const privKey = await jose.importPKCS8(fs.readFileSync("key.txt", {encoding: "utf-8"}, "RSA-OAEP-256"));

    const jwe = fs.readFileSync("out.txt", {encoding: "utf-8"});
    const result = await jose.compactDecrypt(jwe, privKey);
    console.log(new TextDecoder().decode(result.plaintext));
} */

genKeyPair();
// testDecrypt();
