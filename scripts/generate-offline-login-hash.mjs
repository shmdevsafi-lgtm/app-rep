import "dotenv/config";
import { randomBytes, pbkdf2Sync } from "node:crypto";

const fields = {
  lastName: process.env.OFFLINE_LOGIN_LAST_NAME?.trim(),
  firstName: process.env.OFFLINE_LOGIN_FIRST_NAME?.trim(),
  birthDate: process.env.OFFLINE_LOGIN_BIRTH_DATE?.trim(),
  pin: process.env.OFFLINE_LOGIN_PIN?.trim(),
  password: process.env.OFFLINE_LOGIN_PASSWORD,
};

if (Object.values(fields).some((value) => !value)) {
  console.error("Missing OFFLINE_LOGIN_* values. Put the new credentials in a local .env file (never commit it).");
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate)) {
  console.error("OFFLINE_LOGIN_BIRTH_DATE must use YYYY-MM-DD.");
  process.exit(1);
}
if (!/^\d{8,}$/.test(fields.pin)) {
  console.error("Choose a PIN with at least 8 digits.");
  process.exit(1);
}
if (fields.password.length < 12) {
  console.error("Choose a password with at least 12 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const credentialText = [fields.lastName, fields.firstName, fields.birthDate, fields.pin, fields.password].join("|");
const hash = pbkdf2Sync(credentialText, salt, 310_000, 32, "sha256");

console.log("\nAdd these two values as GitHub Actions Secrets:");
console.log(`VITE_OFFLINE_LOGIN_SALT=${salt.toString("hex")}`);
console.log(`VITE_OFFLINE_LOGIN_HASH=${hash.toString("hex")}`);
console.log("\nNever commit your local .env file or share these verifier values publicly.");
