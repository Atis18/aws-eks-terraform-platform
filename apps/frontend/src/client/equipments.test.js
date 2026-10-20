import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../firebase/auth", () => ({
  default: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    },
  },
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

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  api = await import("./equipments");
});

describe("equipment API", () => {
  it("handles an empty equipment list", async () => {
    fetchMock.mockResolvedValue(response([]));

    await expect(api.getAllEquipments()).resolves.toEqual([]);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/equipments");
  });

  it("returns equipment from REST API with Bearer authentication", async () => {
    const equipments = [
      {
        id: "new",
        name: "Laptop",
        type: "Computer",
        amount: 2,
        created: "2026-10-20T12:00:00.000Z",
      },
      {
        id: "old",
        name: "Screen",
        type: "Display",
        amount: 1,
        created: "2026-10-19T12:00:00.000Z",
      },
    ];

    fetchMock.mockResolvedValue(response(equipments));

    const results = await api.getAllEquipments();

    expect(results).toEqual(equipments);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/equipments");

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });

  it("uses POST, PATCH and DELETE for equipment mutations", async () => {
    fetchMock.mockResolvedValue(response({ id: "new-id" }));

    await api.createEquipment({
      name: "Laptop",
      type: "Computer",
      amount: 2,
    });

    await api.updateEquipment("x", { amount: 3 });
    await api.deleteEquipment("x");

    expect(
      fetchMock.mock.calls.map(([, options]) => options.method)
    ).toEqual(["POST", "PATCH", "DELETE"]);

    expect(
      fetchMock.mock.calls.map(([url]) => url)
    ).toEqual([
      "/api/equipments",
      "/api/equipments/x",
      "/api/equipments/x",
    ]);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: "Laptop",
      type: "Computer",
      amount: 2,
    });

    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      amount: 3,
    });

    for (const [, options] of fetchMock.mock.calls) {
      expect(options.headers.Authorization).toBe(
        "Bearer test-token"
      );
    }

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });

  it("reports HTTP errors instead of pretending a delete succeeded", async () => {
    fetchMock.mockResolvedValue(response(null, 401));

    await expect(api.deleteEquipment("x")).rejects.toThrow(
      "Deleting equipment failed (HTTP 401)"
    );
  });
});