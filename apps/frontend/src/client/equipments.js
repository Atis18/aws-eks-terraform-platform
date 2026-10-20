import auth from "../firebase/auth";

const BASE_URL = "/api/equipments";

const ensureOk = (response, action) => {
  if (!response.ok) {
    throw new Error(`${action} failed (HTTP ${response.status}).`);
  }
};

const apiRequest = async (path, action, options = {}) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to access equipment.");
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

export const getAllEquipments = async () => {
  const response = await apiRequest("", "Loading equipment");
  return response.json();
};

export const getOneEquipmentById = async (id) => {
  const response = await apiRequest(
    `/${encodeURIComponent(id)}`,
    "Loading equipment"
  );

  return response.json();
};

export const createEquipment = async (equipment) => {
  const response = await apiRequest("", "Creating equipment", {
    method: "POST",
    body: JSON.stringify(equipment),
  });

  return response.json();
};

export const updateEquipment = async (id, data) => {
  return apiRequest(
    `/${encodeURIComponent(id)}`,
    "Updating equipment",
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
};

export const deleteEquipment = async (id) => {
  return apiRequest(
    `/${encodeURIComponent(id)}`,
    "Deleting equipment",
    {
      method: "DELETE",
    }
  );
};