// Minimal Playwright config for the local chat-UI verification.
// next dev + the local Supabase stack are managed by run-ui.sh, so no webServer.
export default {
  testDir: ".",
  testMatch: "ui.spec.mjs",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: [["list"]],
  use: {
    headless: true,
    baseURL: process.env.APP_URL ?? "http://localhost:3210",
  },
};
