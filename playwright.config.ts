import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * Two projects run every spec twice.
 *
 * `forced-colors` is not a nice-to-have: the Yes/No pills signal selection with
 * a background colour, and Windows High Contrast mode throws author background
 * colours away. Without this project, "selected" and "unselected" can render
 * identically and nothing catches it.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "forced-colors",
      // forcedColors lives under contextOptions, not as a top-level use option.
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: { forcedColors: "active" },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start --port ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          // Build into a separate directory so running the suite never
          // clobbers `.next` under a dev server someone has open.
          NEXT_DIST_DIR: ".next-e2e",
          // Blank on purpose: the suite must never reach a real vendor API, and
          // an inherited .env would send live mail from a test run.
          MAILERLITE_API_KEY: "",
          MAILGUN_API_KEY: "",
          MAILGUN_DOMAIN: "",
          NOTIFY_TO: "",
        },
      },
});
