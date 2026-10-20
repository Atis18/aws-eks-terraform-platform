import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeForm from "../Components/EmployeeForm";
import { createEmployee } from "../client/employees";

const EmployeeCreator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreateEmployee = async (employee) => {
    setLoading(true);
    setError("");
    try {
      await createEmployee(employee);
      navigate("/list");
    } catch (err) {
      setError(err.message || "Create failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <EmployeeForm disabled={loading} onCancel={() => navigate("/list")} onSave={handleCreateEmployee} />
    </>
  );
};

export default EmployeeCreator;
