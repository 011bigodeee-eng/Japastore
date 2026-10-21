import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.includes("intro")) return;
  await page.addInitScript(() => sessionStorage.setItem("japa-intro", "1"));
});
test("catalog filters, search, product selection and persisted cart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "SEU ESTILO. SUA IDENTIDADE." }),
  ).toBeVisible();
  await expect(
    page.getByText("VITRINE DEMONSTRATIVA", { exact: false }),
  ).toBeVisible();
  await page.goto("/catalogo");
  await expect(
    page.getByRole("status").filter({ hasText: "8 peças" }),
  ).toBeVisible();
  await page.getByPlaceholder("Busque sua próxima peça").fill("Bermuda");
  await expect(
    page.getByRole("status").filter({ hasText: "1 peças" }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "Bermuda Urban" }).click();
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Preto", exact: true }).click();
  await page.getByRole("button", { name: "ADICIONAR AO CARRINHO" }).click();
  await page.getByRole("button", { name: /Abrir carrinho/ }).click();
  const dialog = page.getByRole("dialog", { name: "Seu carrinho" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.locator(".cart-total").getByText("R$ 99,90", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("combobox", { name: "Variação de Bermuda Urban" })
    .selectOption({ label: "G / Preto" });
  await dialog.getByRole("spinbutton").fill("2");
  await expect(dialog.getByText("R$ 199,80", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Abrir carrinho/ }).click();
  await expect(dialog.getByRole("spinbutton")).toHaveValue("2");
  await expect(
    dialog.getByRole("combobox", { name: "Variação de Bermuda Urban" }),
  ).toHaveValue("demo-2-2");
  await expect(
    dialog.getByText("Vitrine demonstrativa. Finalização indisponível."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(
    dialog.getByText("Seu estilo começa com uma escolha."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("category links, collection routes and safe admin setup state", async ({
  page,
}) => {
  await page.goto("/catalogo?categoria=moletons");
  await expect(
    page.getByRole("heading", { name: "Moletom Culture" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bermuda Urban" }),
  ).toHaveCount(0);
  await page.goto("/catalogo?colecao=promocoes");
  await expect(
    page.getByRole("heading", { name: "Bermuda Urban" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Moletom Culture" }),
  ).toHaveCount(0);
  await page.goto("/admin");
  await expect(
    page.getByText("Você está visualizando uma prévia da loja."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "SALVAR PRODUTO" }),
  ).toHaveCount(0);
});
test("mobile navigation, filters and layout fit the viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "02 Catálogo" })
    .click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Filtros do catálogo" });
  await d
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("tenis");
  await d.getByRole("button", { name: "Ver 1 peças" }).click();
  await expect(
    page.getByRole("heading", { name: "Tênis Low Street" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("reduced motion skips intro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => sessionStorage.removeItem("japa-intro"));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "PULAR" })).not.toBeVisible();
});

test("intro can be skipped and only appears once per session", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "PULAR" }).click();
  await expect(page.getByRole("button", { name: "PULAR" })).not.toBeVisible();
  await page
    .getByRole("link", { name: "EXPLORAR COLEÇÃO", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu próximo estilo." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "PULAR" })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "PULAR" })).not.toBeVisible();
});
