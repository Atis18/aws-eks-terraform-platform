import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../firebase/auth", () => ({
  default: { currentUser: { getIdToken: vi.fn().mockResolvedValue("test-token") } },
}));

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(body),
});

let api;
let fetchMock;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("VITE_FB_DATABASE_URL", "https://example.firebaseio.test");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  api = await import("./equipments");
});

describe("equipment API", () => {
  it("handles an empty database", async () => {
    fetchMock.mockResolvedValue(response(null));
    await expect(api.getAllEquipments()).resolves.toEqual([]);
  });

  it("returns equipment with Firebase IDs in newest-first order", async () => {
    fetchMock.mockResolvedValue(response({
      old: { name: "Screen", created: 100 },
      new: { name: "Laptop", created: 200 },
    }));
    const results = await api.getAllEquipments();
    expect(results.map(({ id }) => id)).toEqual(["new", "old"]);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("auth")).toBe("test-token");
  });

  it("uses POST, PATCH and DELETE for equipment mutations", async () => {
    fetchMock.mockResolvedValue(response({ name: "new-id" }));
    await api.createEquipment({ name: "Laptop", type: "Computer", amount: 2 });
    await api.updateEquipment("x", { amount: 3 });
    await api.deleteEquipment("x");

    expect(fetchMock.mock.calls.map(([, options]) => options.method)).toEqual(["POST", "PATCH", "DELETE"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      name: "Laptop", type: "Computer", amount: 2, created: expect.any(Number),
    });
    expect(fetchMock.mock.calls[2][0]).toContain("/equipments/list/x.json");
  });

  it("reports HTTP errors instead of pretending a delete succeeded", async () => {
    fetchMock.mockResolvedValue(response(null, 401));
    await expect(api.deleteEquipment("x")).rejects.toThrow("Deleting equipment failed (HTTP 401)");
  });
});
