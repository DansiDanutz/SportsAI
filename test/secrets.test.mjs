import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const liveDatabaseUrl = /postgres(?:ql)?:\/\/[^\s/:]+:([^\s@]+)@([^\s/:]+)/giu;
const documentedPlaceholder = /^(?:\[[A-Z0-9_-]*(?:PASSWORD|PASS)\]|\$\{[A-Z0-9_-]*(?:PASSWORD|PASS)[A-Z0-9_-]*\}|password|pass|your-password-here)$/iu;
const localDatabaseHost = /^(?:localhost|postgres|127(?:\.\d{1,3}){3})$/u;

function assertNoLiveDatabaseCredentials(file, content) {
  for (const match of content.matchAll(liveDatabaseUrl)) {
    if (localDatabaseHost.test(match[2])) continue;
    assert.match(
      match[1],
      documentedPlaceholder,
      `${file} contains a credential-shaped database password`,
    );
  }
}

test("tracked text files contain no live database credentials", () => {
  const files = execFileSync("git", ["grep", "-Il", "", "--", "."], { encoding: "utf8" }).trim().split("\n");
  for (const file of files) {
    if (!file) continue;
    assertNoLiveDatabaseCredentials(file, readFileSync(file, "utf8"));
  }
});

const databaseUrl = (password, host) =>
  ["postgresql://postgres:", password, "@", host, ":5432/postgres"].join("");

test("database credential scan covers direct, pooler, Render, and unknown hosts", () => {
  for (const host of [
    "db.project.supabase.co",
    "aws-0-region.pooler.supabase.com",
    "database.render.com",
    "postgres.internal.example",
  ]) {
    assert.throws(
      () => assertNoLiveDatabaseCredentials("fixture", databaseUrl("not-a-placeholder", host)),
      /credential-shaped database password/u,
    );
  }
});

test("database credential scan permits explicit raw and encoded placeholders", () => {
  for (const password of ["[PASSWORD]", "[URL_ENCODED_PASSWORD]"]) {
    assert.doesNotThrow(() =>
      assertNoLiveDatabaseCredentials(
        "fixture",
        databaseUrl(password, "aws-0-region.pooler.supabase.com"),
      ),
    );
  }
});
