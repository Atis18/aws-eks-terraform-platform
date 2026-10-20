import { useEffect, useState } from "react";
import Loading from "../Components/Loading";
import EquipmentTable from "../Components/EquipmentTable";
import { getAllEquipments } from "../client/equipments";

const EquipmentList = () => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAllEquipments();
        if (!cancelled) setEquipments(list);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load equipment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const deleteEquipment = (id) => {
    setEquipments((previous) => previous.filter((equipment) => equipment.id !== id));
  };

  if (loading) return <Loading />;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  return <EquipmentTable onDelete={deleteEquipment} equipments={equipments} />;
};

export default EquipmentList;
