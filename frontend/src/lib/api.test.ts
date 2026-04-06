import { testsApi } from "@/lib/api";

const STORAGE_KEY = "edutest_auth_state";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client auth recovery", () => {
  it("retries the original request after successful refresh", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: { id: 1, email: "teacher@example.com" },
        token: "expired-token",
      }),
    );

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({ detail: "Access token expired" }, 401),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            access_token: "fresh-token",
            token_type: "bearer",
            user: {
              id: 1,
              email: "teacher@example.com",
              is_active: true,
              is_superuser: false,
              role: "user",
              created_at: "2026-01-01T00:00:00Z",
            },
          },
          200,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            items: [],
            total: 0,
            page: 1,
            per_page: 10,
            total_pages: 0,
          },
          200,
        ),
      );

    const response = await testsApi.getGeneratedForms();

    expect(response.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://localhost:8000/api/auth/refresh",
    );
    expect(
      (fetchMock.mock.calls[2]?.[1] as RequestInit).headers,
    ).toMatchObject({
      Authorization: "Bearer fresh-token",
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").token).toBe(
      "fresh-token",
    );
  });

  it("clears persisted auth state when refresh fails", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: { id: 1, email: "teacher@example.com" },
        token: "expired-token",
      }),
    );

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ detail: "Access expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: "Refresh expired" }, 401));

    await expect(testsApi.getGeneratedForms()).rejects.toThrow("Access expired");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
