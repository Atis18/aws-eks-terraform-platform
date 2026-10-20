import { useEffect, useMemo, useState } from "react";
import Loading from "../Components/Loading";
import EmployeeTable from "../Components/EmployeeTable";
import EmptyState from "../Components/EmptyState";
import { getAllEmployees } from "../client/employees";

const ITEMS_PER_PAGE = 10;

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ position: "", level: "" });
  const [sortConfig, setSortConfig] = useState({ sortBy: "name.firstName", order: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAllEmployees();
        if (!cancelled) setEmployees(list);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load employees.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const sortedEmployees = useMemo(() => {
    const filtered = employees.filter((employee) =>
      (employee.position ?? "").toLowerCase().includes(filters.position) &&
      (employee.level ?? "").toLowerCase().includes(filters.level)
    );

    const getValue = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
    const direction = sortConfig.order === "asc" ? 1 : -1;

    return filtered.sort((a, b) => {
      const valueA = getValue(a, sortConfig.sortBy);
      const valueB = getValue(b, sortConfig.sortBy);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * direction;
      }
      return String(valueA).toLowerCase().localeCompare(String(valueB).toLowerCase()) * direction;
    });
  }, [employees, filters, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / ITEMS_PER_PAGE));
  // Stay on a valid page after deleting the last record on the previous page.
  const visiblePage = Math.min(currentPage, totalPages);
  const currentEmployees = sortedEmployees.slice(
    (visiblePage - 1) * ITEMS_PER_PAGE,
    visiblePage * ITEMS_PER_PAGE
  );

  const filterEmployees = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFilters({
      position: String(data.get("positionInput") ?? "").trim().toLowerCase(),
      level: String(data.get("levelInput") ?? "").trim().toLowerCase(),
    });
    setCurrentPage(1);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSortConfig((previous) => ({ ...previous, [name]: value }));
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    setSortConfig((previous) => ({
      sortBy: column,
      order: previous.sortBy === column && previous.order === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const deleteEmployee = (id) => {
    setEmployees((previous) => previous.filter((employee) => employee.id !== id));
  };

  if (loading) return <Loading />;
  if (error) return <div className="alert alert-danger" role="alert">{error}</div>;

  return (
    <>
      <form className="mb-3 w-100" onSubmit={filterEmployees}>
        <div className="d-flex flex-column gap-2">
          <div className="form-floating flex-fill">
            <input type="text" className="form-control" id="positionInput" name="positionInput" placeholder="Position" />
            <label htmlFor="positionInput">Position</label>
          </div>
          <div className="form-floating flex-fill">
            <input type="text" className="form-control" id="levelInput" name="levelInput" placeholder="Level" />
            <label htmlFor="levelInput">Level</label>
          </div>
        </div>

        <div className="d-flex flex-column gap-2 mb-3">
          <label htmlFor="sortBy">Order By</label>
          <select id="sortBy" className="form-control" name="sortBy" value={sortConfig.sortBy} onChange={handleChange}>
            <option value="name.firstName">First name</option>
            <option value="name.middleName">Middle name</option>
            <option value="name.lastName">Last name</option>
            <option value="position">Position</option>
            <option value="level">Level</option>
          </select>
          <label htmlFor="order">Direction</label>
          <select id="order" className="form-control" name="order" value={sortConfig.order} onChange={handleChange}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary mt-2">Search</button>
      </form>

      {sortedEmployees.length === 0 ? (
        <EmptyState
          title={employees.length === 0 ? "No employees yet" : "No employees found"}
          description={
            employees.length === 0
              ? "Add your first employee to get started."
              : "Try changing the Position or Level filters and search again."
          }
        />
      ) : (
        <>
          <EmployeeTable onDelete={deleteEmployee} employees={currentEmployees} onSort={handleSort} sortConfig={sortConfig} />

          <div className="d-flex justify-content-center mt-3 gap-2">
            <button className="btn btn-outline-primary" disabled={visiblePage === 1} onClick={() => setCurrentPage(visiblePage - 1)}>
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`btn ${visiblePage === i + 1 ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button className="btn btn-outline-primary" disabled={visiblePage >= totalPages} onClick={() => setCurrentPage(visiblePage + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default EmployeeList;
