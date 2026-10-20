import auth from "../firebase/auth";

const BASE_URL = `${import.meta.env.VITE_FB_DATABASE_URL}/employees`;

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to access employees.");
  return user.getIdToken();
};

const getUriForList = async () => `${BASE_URL}/list.json?auth=${encodeURIComponent(await getToken())}`;
const getUriForOne = async (id) => `${BASE_URL}/list/${encodeURIComponent(id)}.json?auth=${encodeURIComponent(await getToken())}`;

const ensureOk = (response, action) => {
  if (!response.ok) throw new Error(`${action} failed (HTTP ${response.status}).`);
};

const sortNewest = (records) => Object.keys(records ?? {})
  .map((key) => ({ id: key, ...records[key] }))
  .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

export const getAllEmployees = async () => {
  const response = await fetch(await getUriForList());
  ensureOk(response, "Loading employees");
  return sortNewest(await response.json());
};

export const getOneEmployeeById = async (id) => {
  const response = await fetch(await getUriForOne(id));
  ensureOk(response, "Loading employee");
  return response.json();
};

export const updateEmployee = async (id, data) => {
  const response = await fetch(await getUriForOne(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  ensureOk(response, "Updating employee");
  return response;
};

export const deleteEmployee = async (id) => {
  const response = await fetch(await getUriForOne(id), { method: "DELETE" });
  ensureOk(response, "Deleting employee");
  return response;
};

export const createEmployee = async (employee) => {
  const response = await fetch(await getUriForList(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...employee, created: Date.now() }),
  });
  ensureOk(response, "Creating employee");
  return response.json();
};

export const searchEmployees = async (search) => {
  const query = search.toLowerCase().trim();
  if (!query) return [];

  // The indexed fullName field is stored lowercased. Find matching prefixes
  // through Firebase REST, then require an exact first- or full-name match.
  const url = `${await getUriForList()}&orderBy=${encodeURIComponent('"fullName"')}` +
    `&startAt=${encodeURIComponent(JSON.stringify(query))}` +
    `&endAt=${encodeURIComponent(JSON.stringify(`${query}\uf8ff`))}`;

  const response = await fetch(url);
  ensureOk(response, "Searching employees");
  const results = sortNewest(await response.json());
  return results.filter((employee) =>
    employee.name?.firstName?.trim().toLowerCase() === query ||
    employee.fullName?.trim().toLowerCase() === query
  );
};
