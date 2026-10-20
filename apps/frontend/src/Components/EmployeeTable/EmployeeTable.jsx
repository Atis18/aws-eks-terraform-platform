import { Link } from "react-router-dom";
import DeleteButton from "./components/DeleteButton";

const EmployeeTable = ({ employees, onDelete, onSort = () => { }, sortConfig = null }) => (
  <table className="table table-striped table-bordered">
    <thead>
      <tr>
        <th style={{ cursor: "pointer" }} onClick={() => onSort("name.lastName")}        >
          Name{" "} {sortConfig?.sortBy === "name.lastName" ? sortConfig?.order === "asc" ? "▲" : "▼" : ""}
        </th>

        <th style={{ cursor: "pointer" }} onClick={() => onSort("level")}        >
          Level{" "} {sortConfig?.sortBy === "level" ? sortConfig?.order === "asc" ? "▲" : "▼" : ""}
        </th>

        <th style={{ cursor: "pointer" }} onClick={() => onSort("position")}        >
          Position{" "} {sortConfig?.sortBy === "position" ? sortConfig?.order === "asc" ? "▲" : "▼" : ""}
        </th>

        <th>Equipment</th>
        <th />
      </tr>
    </thead>
    <tbody>
      {employees.map((employee) => (
        <tr key={employee.id}>
          <td>{`${employee.name.firstName} ${employee.name.middleName ?? ""} ${employee.name.lastName}`}</td>
          <td>{employee.level}</td>
          <td>{employee.position}</td>
          <td>{employee.equipment}</td>
          <td>
            <div className="btn-group">
              <Link to={`/updateEmployee/${employee.id}`} className="btn btn-primary">
                Update
              </Link>
              <DeleteButton employeeId={employee.id} onDelete={onDelete} />
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default EmployeeTable;
