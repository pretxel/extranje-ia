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

test("redesigned chat: empty-state prompts send, branded answer, no Fuentes, copy, live counter", async ({
  page,
  context,
}) => {
  await setUsage(0); // fresh, under the limit
  await authenticate(context);

  await page.goto("/dashboard/chat");
  await expect(page).toHaveURL(/\/dashboard\/chat/); // cookie accepted, not bounced to /sign-in

  await expect(page.getByText(/Has usado/)).toBeVisible(); // counter banner present (0 of 5)

  // Branded empty state with suggested prompts; clicking one sends the first turn.
  await expect(page.getByRole("heading", { name: /En qué te puedo ayudar/ })).toBeVisible();
  const chips = page.locator("button", { hasText: /NIE|TIE|arraigo|residencia/ });
  await expect(chips.first()).toBeVisible();
  await page.screenshot({ path: "scripts/verify-local/shot-empty.png", fullPage: true });
  await chips.first().click();

  // Branded assistant bubble (testid + editorial byline) fills with streamed text.
  const assistantBubble = page.getByTestId("assistant-message").last();
  await expect(assistantBubble).toContainText(/\S/, { timeout: 40000 });
  await expect(assistantBubble.getByText("Extranjería")).toBeVisible(); // editorial byline

  await expect(page.getByText("Fuentes")).toHaveCount(0); // no sources block
  await expect(page.getByText(/Has usado\s*1\s*de\s*5/)).toBeVisible({ timeout: 10000 }); // counter moved live

  // Copy control on the assistant message works.
  await assistantBubble.getByRole("button", { name: /Copiar respuesta/ }).click();
  await expect(assistantBubble.getByText("Copiado")).toBeVisible();

  await page.screenshot({ path: "scripts/verify-local/shot-chat.png", fullPage: true });
});

test("at-limit shows the amber limit banner and disables the input", async ({ page, context }) => {
  await setUsage(5); // at the free cap
  await authenticate(context);

  await page.goto("/dashboard/chat");
  await expect(page.getByText(/Has agotado tus 5 consultas gratuitas/)).toBeVisible(); // UsageBanner at-limit
  await expect(page.getByText(/Actualiza a Pro para seguir consultando/)).toBeVisible(); // ChatInterface limit strip
  await expect(page.getByPlaceholder(/Escribe tu consulta/)).toBeDisabled(); // input guarded at limit
  // Regression guard (#6): at the limit the send button is disabled but must
  // NOT show the streaming spinner — blocked != loading.
  await expect(page.locator('button[aria-label="Enviar mensaje"]')).toBeDisabled();
  await expect(page.locator('button[aria-label="Enviar mensaje"] svg.animate-spin')).toHaveCount(0);

  await page.screenshot({ path: "scripts/verify-local/shot-limit.png", fullPage: true });
});
