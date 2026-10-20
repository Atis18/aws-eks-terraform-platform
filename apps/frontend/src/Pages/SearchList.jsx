import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../Components/Loading";
import EmployeeTable from "../Components/EmployeeTable";
import EmptyState from "../Components/EmptyState";
import { searchEmployees } from "../client/employees";

const SearchList = () => {
  const { search } = useParams();
  const navigate = useNavigate();
  const [value, setValue] = useState(search ?? "");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(search ?? "");
    if (!search?.trim()) {
      setEmployees([]);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const result = await searchEmployees(search);
        if (!cancelled) setEmployees(result);
      } catch (err) {
        if (!cancelled) {
          setEmployees([]);
          setError(err.message || "Failed to search employees.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [search]);

  const onSearch = (event) => {
    event.preventDefault();
    const query = value.trim();
    navigate(query ? `/employees/${encodeURIComponent(query)}` : "/employees");
  };

  const deleteEmployee = (id) => {
    setEmployees((previous) => previous.filter((employee) => employee.id !== id));
  };

  return (
    <>
      <form className="mb-3 w-100" onSubmit={onSearch}>
        <div className="form-floating flex-fill">
          <input id="nameSearch" type="text" className="form-control" placeholder="Name" value={value} onChange={(event) => setValue(event.target.value)} />
          <label htmlFor="nameSearch">Name:</label>
        </div>
        <button type="submit" className="btn btn-primary mt-2">Search</button>
      </form>
      {loading ? <Loading /> : error ? (
        <div className="alert alert-danger" role="alert">{error}</div>
      ) : !search?.trim() ? (
        <EmptyState
          title="Search employees"
          description="Enter a first or full name above to find employees."
        />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="No employees match that name. Try a different search."
        />
      ) : (
        <EmployeeTable onDelete={deleteEmployee} employees={employees} />
      )}
    </>
  );
};

export default SearchList;
