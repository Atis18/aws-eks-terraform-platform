import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EquipmentForm from "../Components/EquipmentForm";
import { createEquipment } from "../client/equipments";

const EquipmentCreator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreateEquipment = async (equipment) => {
    setLoading(true);
    setError("");
    try {
      await createEquipment(equipment);
      navigate("/equipments");
    } catch (err) {
      setError(err.message || "Create failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <EquipmentForm disabled={loading} onCancel={() => navigate("/equipments")} onSave={handleCreateEquipment} />
    </>
  );
};

export default EquipmentCreator;
