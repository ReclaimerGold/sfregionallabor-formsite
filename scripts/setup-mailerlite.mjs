#!/usr/bin/env node
/**
 * One-time (idempotent) MailerLite setup.
 *
 *   npm run setup:mailerlite
 *
 * Creates the custom fields listed in config/mailerlite-fields.json if they
 * don't already exist, optionally creates the group named by
 * MAILERLITE_GROUP_NAME, then prints every group ID so you can paste the right
 * one into MAILERLITE_GROUP_ID.
 *
 * Safe to run repeatedly — existing fields and groups are left untouched.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API_BASE = "https://connect.mailerlite.com/api";
const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(here, "..", "config", "mailerlite-fields.json"), "utf8"),
);

const apiKey = process.env.MAILERLITE_API_KEY?.trim();
if (!apiKey) {
  console.error(
    "MAILERLITE_API_KEY is not set.\n" +
      "Add it to .env, then run: npm run setup:mailerlite",
  );
  process.exit(1);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path} → ${response.status}: ${text.slice(0, 400)}`,
    );
  }
  return body;
}

/** Walk every page of a list endpoint. */
async function listAll(path) {
  const items = [];
  const limit = 100;
  for (let page = 1; page <= 50; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const body = await api(`${path}${separator}limit=${limit}&page=${page}`);
    const batch = body.data ?? [];
    items.push(...batch);
    if (batch.length < limit) break;
  }
  return items;
}

async function ensureFields() {
  console.log("Checking custom fields…");
  const existing = await listAll("/fields");
  const byKey = new Map(existing.map((field) => [field.key, field]));

  let created = 0;
  for (const field of config.fields) {
    const found = byKey.get(field.key);
    if (found) {
      const typeNote =
        found.type === field.type
          ? ""
          : `  ⚠ exists as type "${found.type}", expected "${field.type}"`;
      console.log(`  ✓ ${field.key} (exists)${typeNote}`);
      continue;
    }

    await api("/fields", {
      method: "POST",
      body: JSON.stringify({ name: field.name, type: field.type }),
    });
    created += 1;
    console.log(`  + ${field.key} (created as "${field.name}")`);
  }

  console.log(
    created === 0
      ? "All custom fields already present.\n"
      : `Created ${created} field(s).\n`,
  );

  // MailerLite derives the key from the name; warn if a derived key drifted.
  const after = await listAll("/fields");
  const keys = new Set(after.map((field) => field.key));
  const missing = config.fields.filter((field) => !keys.has(field.key));
  if (missing.length > 0) {
    console.warn(
      "⚠ These keys are still missing — MailerLite may have derived a different\n" +
        "  key from the field name. Check the field keys in your MailerLite\n" +
        "  account and update config/mailerlite-fields.json to match:",
    );
    for (const field of missing) console.warn(`    ${field.key}`);
    console.warn("");
  }
}

async function ensureGroup() {
  const wanted = process.env.MAILERLITE_GROUP_NAME?.trim();
  const groups = await listAll("/groups");

  if (wanted && !groups.some((group) => group.name === wanted)) {
    const created = await api("/groups", {
      method: "POST",
      body: JSON.stringify({ name: wanted }),
    });
    groups.push(created.data);
    console.log(`Created group "${wanted}".`);
  }

  console.log("Groups in this account:");
  if (groups.length === 0) {
    console.log("  (none — create one in MailerLite or set MAILERLITE_GROUP_NAME)");
  }
  for (const group of groups) {
    console.log(`  ${group.id}  ${group.name}`);
  }
  console.log(
    "\nPaste the ID you want new submissions added to into MAILERLITE_GROUP_ID\n" +
      "in .env (and optionally MAILERLITE_VOLUNTEER_GROUP_ID).",
  );
}

try {
  await ensureFields();
  await ensureGroup();
} catch (error) {
  console.error(`\nSetup failed: ${error.message}`);
  process.exit(1);
}
