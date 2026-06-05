// Drives the real chat UI at /dashboard/chat in a browser, authenticated by a
// session cookie minted the same way the SSR server expects. Captures the
// pixels the API harness can't: the streamed answer with no "Fuentes" block,
// the live usage counter, and the at-limit amber banner with a disabled input.
import { createServerClient } from "@supabase/ssr";
import { expect, test } from "@playwright/test";
import pg from "pg";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.VERIFY_EMAIL ?? "verify@local.test";
const PASS = process.env.VERIFY_PASSWORD ?? "Verify12345!";

async function setUsage(value) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("UPDATE users SET queries_used = $2 WHERE email = $1", [EMAIL, value]);
  await client.end();
}

async function authenticate(context) {
  const jar = new Map();
  const supa = createServerClient(URL, KEY, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cs) => {
        for (const { name, value } of cs) jar.set(name, value);
      },
    },
  });
  const { error } = await supa.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  await context.addCookies(
    [...jar.entries()].map(([name, value]) => ({
      name,
      value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    })),
  );
}

test("authenticated chat renders a streamed answer with no Fuentes block + live counter", async ({
  page,
  context,
}) => {
  await setUsage(0); // fresh, under the limit
  await authenticate(context);

  await page.goto("/dashboard/chat");
  await expect(page).toHaveURL(/\/dashboard\/chat/); // cookie accepted, not bounced to /sign-in

  await expect(page.getByText(/Has usado/)).toBeVisible(); // counter banner present (0 of 5)

  await page.getByPlaceholder(/Escribe tu consulta/).fill("¿Qué es el NIE?");
  await page.keyboard.press("Enter");

  // Assistant bubble fills with streamed text (real gpt-4o).
  const assistantBubble = page.locator("div.bg-gray-100.text-gray-900").last();
  await expect(assistantBubble).toContainText(/\S/, { timeout: 40000 });

  await expect(page.getByText("Fuentes")).toHaveCount(0); // the whole point of the change
  await expect(page.getByText(/Has usado\s*1\s*de\s*5/)).toBeVisible({ timeout: 10000 }); // counter moved live

  await page.screenshot({ path: "scripts/verify-local/shot-chat.png", fullPage: true });
});

test("at-limit shows the amber limit banner and disables the input", async ({ page, context }) => {
  await setUsage(5); // at the free cap
  await authenticate(context);

  await page.goto("/dashboard/chat");
  await expect(page.getByText(/Has agotado tus 5 consultas gratuitas/)).toBeVisible(); // UsageBanner at-limit
  await expect(page.getByText(/Actualiza a Pro para seguir consultando/)).toBeVisible(); // ChatInterface limit strip
  await expect(page.getByPlaceholder(/Escribe tu consulta/)).toBeDisabled(); // input guarded at limit

  await page.screenshot({ path: "scripts/verify-local/shot-limit.png", fullPage: true });
});
