import auth from "../firebase/auth";

const BASE_URL = `${import.meta.env.VITE_FB_DATABASE_URL}/equipments`;

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to access equipment.");
  return user.getIdToken();
};

const getUriForList = async () => `${BASE_URL}/list.json?auth=${encodeURIComponent(await getToken())}`;
const getUriForOne = async (id) => `${BASE_URL}/list/${encodeURIComponent(id)}.json?auth=${encodeURIComponent(await getToken())}`;

const ensureOk = (response, action) => {
  if (!response.ok) throw new Error(`${action} failed (HTTP ${response.status}).`);
};

export const getAllEquipments = async () => {
  const response = await fetch(await getUriForList());
  ensureOk(response, "Loading equipment");
  const equipments = await response.json();
  return Object.keys(equipments ?? {})
    .map((key) => ({ id: key, ...equipments[key] }))
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
};

export const getOneEquipmentById = async (id) => {
  const response = await fetch(await getUriForOne(id));
  ensureOk(response, "Loading equipment");
  return response.json();
};

export const updateEquipment = async (id, data) => {
  const response = await fetch(await getUriForOne(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  ensureOk(response, "Updating equipment");
  return response;
};

export const deleteEquipment = async (id) => {
  const response = await fetch(await getUriForOne(id), { method: "DELETE" });
  ensureOk(response, "Deleting equipment");
  return response;
};

export const createEquipment = async (equipment) => {
  const response = await fetch(await getUriForList(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...equipment, created: Date.now() }),
  });
  ensureOk(response, "Creating equipment");
  return response.json();
};
