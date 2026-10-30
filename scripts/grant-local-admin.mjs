import fs from "node:fs/promises";
const email = String(process.argv[2] || "")
  .trim()
  .toLowerCase();
if (!email || !email.includes("@"))
  throw new Error(
    "Usage: node scripts/grant-local-admin.mjs operator@example.com",
  );
const file = new URL("../.local/state.json", import.meta.url);
const state = JSON.parse(await fs.readFile(file, "utf8"));
const index = state[`useremail:${email}`];
if (!index)
  throw new Error(
    "Create the local account first with registration temporarily enabled.",
  );
const userId = JSON.parse(index.value);
const record = state[`user:${userId}`];
const user = JSON.parse(record.value);
user.role = "admin";
record.value = JSON.stringify(user);
await fs.writeFile(
  new URL("../.local/state.json.tmp", import.meta.url),
  JSON.stringify(state),
);
await fs.rename(new URL("../.local/state.json.tmp", import.meta.url), file);
console.log(
  "Local account promoted. Restart the local API and sign in again. No remote resources changed.",
);
