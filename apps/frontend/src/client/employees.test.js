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
  // The app normally obtains this value from .env.local. Tests use a dummy URL.
  vi.resetModules();
  vi.stubEnv("VITE_FB_DATABASE_URL", "https://example.firebaseio.test");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  api = await import("./employees");
});

describe("employee API", () => {
  it("returns an empty list when Firebase returns null", async () => {
    fetchMock.mockResolvedValue(response(null));

    await expect(api.getAllEmployees()).resolves.toEqual([]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/employees/list.json");
    expect(url.searchParams.get("auth")).toBe("test-token");
  });

  it("maps Firebase keys to IDs and sorts newest first", async () => {
    fetchMock.mockResolvedValue(response({
      older: { created: 100, name: { firstName: "Alex" } },
      newer: { created: 200, name: { firstName: "Beth" } },
    }));

    const employees = await api.getAllEmployees();
    expect(employees.map((employee) => employee.id)).toEqual(["newer", "older"]);
  });

  it("creates employees with a timestamp and JSON body", async () => {
    fetchMock.mockResolvedValue(response({ name: "firebase-key" }));
    const employee = { name: { firstName: "Anna" } };

    await expect(api.createEmployee(employee)).resolves.toEqual({ name: "firebase-key" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get("auth")).toBe("test-token");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({ ...employee, created: expect.any(Number) });
  });

  it("updates and deletes the requested employee", async () => {
    fetchMock.mockResolvedValue(response(null));
    await api.updateEmployee("user-1", { level: "Senior" });
    await api.deleteEmployee("user-1");

    expect(fetchMock.mock.calls[0][0]).toContain("/employees/list/user-1.json");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ level: "Senior" }),
    });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  });

  it("throws a meaningful error on unsuccessful HTTP responses", async () => {
    fetchMock.mockResolvedValue(response(null, 403));
    await expect(api.getAllEmployees()).rejects.toThrow("Loading employees failed (HTTP 403)");
    await expect(api.deleteEmployee("user-1")).rejects.toThrow("Deleting employee failed (HTTP 403)");
  });

  it("searches the indexed fullName field but keeps only exact first-name matches", async () => {
    fetchMock.mockResolvedValue(response({
      one: { fullName: "robert brown", name: { firstName: "Robert" } },
      two: { fullName: "roberta jones", name: { firstName: "Roberta" } },
      three: { fullName: "robert smith", name: { firstName: "Robert" } },
    }));

    const employees = await api.searchEmployees("  RoBeRt ");
    expect(employees.map(({ id }) => id)).toEqual(expect.arrayContaining(["one", "three"]));
    expect(employees).toHaveLength(2);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("orderBy")).toBe('"fullName"');
    expect(url.searchParams.get("startAt")).toBe('"robert"');
    expect(JSON.parse(url.searchParams.get("endAt"))).toBe("robert\uf8ff");
  });

  it("finds an exact full-name match", async () => {
    fetchMock.mockResolvedValue(response({
      a: { fullName: "robert smith", name: { firstName: "Robert" } },
    }));
    await expect(api.searchEmployees("Robert Smith")).resolves.toHaveLength(1);
  });

  it("does not contact Firebase for an empty search", async () => {
    await expect(api.searchEmployees("  ")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not silently hide a failed search request", async () => {
    fetchMock.mockResolvedValue(response(null, 400));
    await expect(api.searchEmployees("Robert")).rejects.toThrow("Searching employees failed (HTTP 400)");
  });
});
