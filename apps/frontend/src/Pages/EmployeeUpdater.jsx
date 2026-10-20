import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmployeeForm from "../Components/EmployeeForm";
import Loading from "../Components/Loading";
import { getOneEmployeeById, updateEmployee } from "../client/employees";

const EmployeeUpdater = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await getOneEmployeeById(id);
        if (!cancelled) setEmployee(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load employee.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleUpdateEmployee = async (data) => {
    setMutating(true);
    setError("");
    try {
      await updateEmployee(id, data);
      navigate("/list");
    } catch (err) {
      setError(err.message || "Update failed.");
    } finally {
      setMutating(false);
    }
  };

  if (loading) return <Loading />;
  if (!employee && !error) return <div className="alert alert-warning">Employee not found.</div>;
  if (!employee) return <div className="alert alert-danger" role="alert">{error}</div>;

  return (
    <>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <EmployeeForm employee={employee} onSave={handleUpdateEmployee} disabled={mutating} onCancel={() => navigate("/list")} />
    </>
  );
};

export default EmployeeUpdater;
