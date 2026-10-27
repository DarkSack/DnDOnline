import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";

/** Cuenta nueva en su propio navegador (contexto aislado, con sus cookies). */
async function register(browser: Browser, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/register");
  await page.getByLabel("Nombre visible").fill(name);
  await page.getByLabel("Correo").fill(`${name.toLowerCase()}-${randomUUID()}@e2e.test`);
  await page.getByLabel("Contraseña").fill(`clave-${randomUUID()}`);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return page;
}

test("registro → campaña → invitación → personaje → sesión con dos navegadores", async ({ browser }) => {
  const dm = await register(browser, "Dama");
  const player = await register(browser, "Jugadora");

  // El DM crea la campaña y una invitación de jugador.
  await dm.getByRole("link", { name: "Nueva campaña" }).click();
  await dm.getByLabel("Nombre", { exact: true }).fill("La cripta");
  await dm.getByRole("button", { name: "Crear campaña" }).click();
  await expect(dm).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
  const campaignId = dm.url().split("/").pop()!;
  await dm.getByRole("button", { name: "Crear invitación" }).click();
  const code = (await dm.locator("code").first().textContent())!.trim();

  // La jugadora se une con el código y crea su personaje en la campaña.
  await player.getByLabel("CÓDIGO").fill(code);
  await player.getByRole("button", { name: "Unirme" }).click();
  await expect(player).toHaveURL(new RegExp(`/campaigns/${campaignId}$`));
  await player.goto(`/characters/new?campaign=${campaignId}`);
  await player.getByLabel("Nombre del personaje").fill("Aria");
  for (let i = 0; i < 3; i++) await player.getByRole("button", { name: "Siguiente" }).click();
  await player.getByRole("button", { name: "Crear personaje" }).click();
  await expect(player).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);

  // El DM prepara una escena, la pone en la mesa y coloca a Aria y a un goblin.
  await dm.reload();
  await dm.getByLabel("Nombre", { exact: true }).fill("Cripta");
  await dm.getByRole("button", { name: "Crear escena" }).click();
  await expect(dm.getByText(/en la mesa|×/).first()).toBeVisible();
  await dm.getByRole("link", { name: "Entrar a la mesa" }).click();
  await expect(dm.getByText("En vivo")).toBeVisible();
  const sceneId = await dm.locator("option", { hasText: "Cripta" }).getAttribute("value");
  await dm.getByRole("combobox", { name: /^Escena/ }).selectOption(sceneId!);
  await dm.getByRole("button", { name: /\+ Aria/ }).click();
  await dm.getByRole("button", { name: /Goblin/ }).click();
  await dm.locator("canvas").click({ position: { x: 200, y: 200 } });

  // La jugadora entra a la mesa: chat en directo en los dos sentidos.
  await player.goto(`/campaigns/${campaignId}/mesa`);
  await expect(player.getByText("En vivo")).toBeVisible();
  await player.getByLabel("Escribe un mensaje…").fill("¡Hola, mesa!");
  await player.getByRole("button", { name: "Enviar" }).click();
  await expect(dm.getByText("¡Hola, mesa!")).toBeVisible();

  // Combate: el DM lo inicia con las dos fichas y el servidor tira la iniciativa.
  await dm.getByRole("button", { name: "Iniciar combate" }).click();
  await expect(dm.getByRole("checkbox", { name: "Goblin" })).toBeChecked();
  await dm.getByRole("button", { name: "Iniciar combate" }).click();
  for (const page of [dm, player]) await expect(page.getByText(/Ronda 1/)).toBeVisible();
  await expect(player.getByRole("listitem").filter({ hasText: "Goblin" })).toBeVisible();
  await expect(player.getByRole("button", { name: "Terminar combate" })).toHaveCount(0);

  // Si empieza el goblin, el DM pasa su turno; luego la jugadora pasa el de Aria.
  if (await dm.getByText(/Turno de Goblin/).isVisible()) await dm.getByRole("button", { name: "Siguiente turno" }).click();
  await expect(player.getByText(/Turno de Aria/)).toBeVisible();
  await player.getByRole("button", { name: "Siguiente turno" }).click();
  await expect(dm.getByText(/Turno de Goblin/)).toBeVisible();
  await expect(player.getByRole("button", { name: "Siguiente turno" })).toHaveCount(0);

  await dm.getByRole("button", { name: "Terminar combate" }).click();
  await expect(player.getByText(/Ronda/)).toHaveCount(0);
});
