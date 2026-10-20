import { useState } from "react";
import { deleteEquipment } from "../../../client/equipments";

const DeleteButton = ({ equipmentId, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await deleteEquipment(equipmentId);
      onDelete(equipmentId); // Only remove the row after Firebase confirms deletion.
    } catch (err) {
      setError(err.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button disabled={loading} className="btn btn-danger" type="button" onClick={handleDelete}>
        {loading ? "..." : "Delete"}
      </button>
      {error && <span className="text-danger ms-2" role="alert">{error}</span>}
    </>
  );
};

export default DeleteButton;
