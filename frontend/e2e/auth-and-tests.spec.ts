import { expect, test } from "@playwright/test";

const userState = {
  user: {
    id: 2,
    email: "teacher@example.com",
    full_name: "Teacher User",
    is_active: true,
    is_superuser: false,
    role: "user",
    created_at: "2026-01-01T00:00:00Z",
  },
  token: "user-token",
};

test("user can sign in and open tests dashboard", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await page.context().addCookies([
      {
        name: "edutest_refresh_token",
        value: "refresh-token",
        domain: "localhost",
        path: "/api/auth",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "user-token",
        token_type: "bearer",
        user: userState.user,
      }),
    });
  });

  await page.route("**/api/tests/generated**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: 10,
            title: "Алгебра итоговый тест",
            published_url: "https://forms.example.com/fill",
            edit_url: "https://forms.example.com/edit",
            question_count: 5,
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
        total_pages: 1,
      }),
    });
  });

  await page.goto("/login");
  await page.getByPlaceholder("teacher@example.com").fill("teacher@example.com");
  await page.getByPlaceholder("••••••••").fill("secret123");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/app\/tests$/);
  await expect(
    page.getByRole("heading", { name: "Алгебра итоговый тест" }),
  ).toBeVisible();
});

test("admin can open user management page", async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem("edutest_auth_state", JSON.stringify(state));
  }, {
    user: {
      id: 1,
      email: "admin@example.com",
      full_name: "Admin User",
      is_active: true,
      is_superuser: true,
      role: "admin",
      created_at: "2026-01-01T00:00:00Z",
    },
    token: "admin-token",
  });

  await page.route("**/api/users", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 1,
          email: "admin@example.com",
          full_name: "Admin User",
          is_active: true,
          is_superuser: true,
          role: "admin",
          created_at: "2026-01-01T00:00:00Z",
        },
      ]),
    });
  });

  await page.goto("/app/admin");

  await expect(page.getByText("Управление пользователями")).toBeVisible();
  await expect(
    page.getByRole("main").getByText("admin@example.com"),
  ).toBeVisible();
});

test("tests filters and pagination update the url", async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem("edutest_auth_state", JSON.stringify(state));
  }, userState);

  await page.route("**/api/tests/generated**", async (route) => {
    const url = new URL(route.request().url());
    const pageParam = url.searchParams.get("page") || "1";
    const search = url.searchParams.get("search") || "";

    const body =
      pageParam === "2"
        ? {
            items: [
              {
                id: 22,
                title: "Алгебра страница 2",
                published_url: "https://forms.example.com/fill-2",
                edit_url: "https://forms.example.com/edit-2",
                question_count: 4,
                created_at: "2026-01-02T00:00:00Z",
              },
            ],
            total: 2,
            page: 2,
            per_page: 10,
            total_pages: 2,
          }
        : {
            items: [
              {
                id: 21,
                title: search ? "Алгебра страница 1" : "Начальный тест",
                published_url: "https://forms.example.com/fill-1",
                edit_url: "https://forms.example.com/edit-1",
                question_count: 3,
                created_at: "2026-01-01T00:00:00Z",
              },
            ],
            total: search ? 2 : 1,
            page: 1,
            per_page: 10,
            total_pages: search ? 2 : 1,
          };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.goto("/app/tests");
  await page.getByPlaceholder("Введите текст...").fill("алгебра");
  await page.getByRole("button", { name: "Применить" }).click();

  await expect(page).toHaveURL(/search=%D0%B0%D0%BB%D0%B3%D0%B5%D0%B1%D1%80%D0%B0/);
  await expect(
    page.getByRole("heading", { name: "Алгебра страница 1" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Далее" }).click();

  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("heading", { name: "Алгебра страница 2" }),
  ).toBeVisible();
});
