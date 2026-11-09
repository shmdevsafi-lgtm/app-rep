import { pbkdf2Sync, randomBytes } from "node:crypto";
import readline from "node:readline/promises";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lastName = await rl.question("Nom de famille : ");
const firstName = await rl.question("Prénom : ");
const birthDate = await rl.question("Date de naissance (AAAA-MM-JJ) : ");
const pin = await rl.question("PIN : ");
const password = await rl.question("Mot de passe : ");
rl.close();

const salt = randomBytes(16).toString("hex");
const secret = [lastName.trim().toLowerCase(), firstName.trim().toLowerCase(), birthDate.trim(), pin.trim(), password].join("|");
const hash = pbkdf2Sync(secret, salt, 200000, 32, "sha256").toString("hex");
console.log(`\nVITE_AUTH_SALT=${salt}\nVITE_AUTH_HASH=${hash}`);
