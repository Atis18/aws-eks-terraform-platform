import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EquipmentForm from "../Components/EquipmentForm";
import Loading from "../Components/Loading";
import { getOneEquipmentById, updateEquipment } from "../client/equipments";

const EquipmentUpdater = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await getOneEquipmentById(id);
        if (!cancelled) setEquipment(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load equipment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleUpdateEquipment = async (data) => {
    setMutating(true);
    setError("");
    try {
      await updateEquipment(id, data);
      navigate("/equipments");
    } catch (err) {
      setError(err.message || "Update failed.");
    } finally {
      setMutating(false);
    }
  };

  if (loading) return <Loading />;
  if (!equipment && !error) return <div className="alert alert-warning">Equipment not found.</div>;
  if (!equipment) return <div className="alert alert-danger" role="alert">{error}</div>;

  return (
    <>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <EquipmentForm equipment={equipment} onSave={handleUpdateEquipment} disabled={mutating} onCancel={() => navigate("/equipments")} />
    </>
  );
};

export default EquipmentUpdater;
