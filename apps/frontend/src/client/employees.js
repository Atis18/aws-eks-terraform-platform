import auth from "../firebase/auth";

const BASE_URL = "/api/employees";

const ensureOk = (response, action) => {
  if (!response.ok) {
    throw new Error(`${action} failed (HTTP ${response.status}).`);
  }
};

const apiRequest = async (path, action, options = {}) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to access employees.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  ensureOk(response, action);

  return response;
};

export const getAllEmployees = async () => {
  const response = await apiRequest("", "Loading employees");
  return response.json();
};

export const getOneEmployeeById = async (id) => {
  const response = await apiRequest(
    `/${encodeURIComponent(id)}`,
    "Loading employee"
  );

  return response.json();
};

export const createEmployee = async (employee) => {
  const response = await apiRequest("", "Creating employee", {
    method: "POST",
    body: JSON.stringify(employee),
  });

  return response.json();
};

export const updateEmployee = async (id, data) => {
  // Only send fields accepted by the Express PATCH endpoint.
  const allowedFields = ["name", "position", "level", "equipment"];

  const updates = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        allowedFields.includes(key) && value !== undefined
    )
  );

  return apiRequest(
    `/${encodeURIComponent(id)}`,
    "Updating employee",
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
};

export const deleteEmployee = async (id) => {
  return apiRequest(
    `/${encodeURIComponent(id)}`,
    "Deleting employee",
    {
      method: "DELETE",
    }
  );
};

export const searchEmployees = async (search) => {
  const query = search?.trim().toLowerCase();

  if (!query) return [];

  const employees = await getAllEmployees();

  return employees.filter(
    (employee) =>
      employee.name?.firstName?.trim().toLowerCase() === query ||
      employee.fullName?.trim().toLowerCase() === query
  );
};