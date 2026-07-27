import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("tracked text files contain no live database credentials", () => {
  const files = execFileSync("git", ["grep", "-Il", "", "--", "."], { encoding: "utf8" }).trim().split("\n");
  const liveDatabaseUrl = /postgres(?:ql)?:\/\/[^\s/:]+:([^\s@\][<]+)@(?:db\.[a-z0-9]+\.supabase\.co|[^\s/]+\.render\.com)/giu;
  for (const file of files) {
    if (!file) continue;
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(liveDatabaseUrl)) {
      assert.match(match[1], /^(?:password|pass|your-password-here)$/iu, `${file} contains a credential-shaped database password`);
    }
  }
});
