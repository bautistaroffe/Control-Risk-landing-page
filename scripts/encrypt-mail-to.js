const crypto = require("crypto");

const email = process.argv[2];
const keyInput = process.argv[3];

if (!email || !keyInput) {
  console.error("Uso: node scripts/encrypt-mail-to.js <mail_to> <mail_to_key>");
  process.exit(1);
}

const iv = crypto.randomBytes(12);
const key = crypto.createHash("sha256").update(String(keyInput)).digest();
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

const encrypted = Buffer.concat([cipher.update(email, "utf8"), cipher.final()]);
const tag = cipher.getAuthTag();

const output = `${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
console.log(output);
