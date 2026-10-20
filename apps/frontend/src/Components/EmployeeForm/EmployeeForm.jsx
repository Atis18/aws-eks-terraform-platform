import { useEffect, useState } from "react";
import { getAllEquipments } from "../../client/equipments";

const EmployeeForm = ({ onSave, disabled = false, employee, onCancel }) => {
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(
    !employee?.equipment || employee.equipment.toLowerCase() === "n/a" ? "N/A" : employee.equipment.toLowerCase()
  );
  const [equipmentError, setEquipmentError] = useState("");

  useEffect(() => {
    let lock = false;

    (async () => {
      try {
        const list = await getAllEquipments();
        if (!lock) setEquipments(list);
      } catch (err) {
        if (!lock) setEquipmentError(err.message || "Failed to load equipment options.");
      }
    })();

    return () => {
      lock = true;
    };
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const entries = [...formData.entries()];
    const data = Object.fromEntries(entries);
    const employee = {
      fullName: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ").toLowerCase().trim(),
      name: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName
      },
      level: data.level,
      position: data.position,
      equipment: selectedEquipment
    };
    return onSave(employee);
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-3">
        <label className="form-label" htmlFor="firstName">First Name:</label>
        <input
          className="form-control"
          defaultValue={employee ? employee.name.firstName : null}
          name="firstName"
          id="firstName"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="middleName">Middle Name:</label>
        <input
          className="form-control"
          defaultValue={employee ? employee.name.middleName : null}
          name="middleName"
          id="middleName"
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="lastName">Last Name:</label>
        <input
          className="form-control"
          defaultValue={employee ? employee.name.lastName : null}
          name="lastName"
          id="lastName"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="level">Level:</label>
        <input
          className="form-control"
          defaultValue={employee ? employee.level : null}
          name="level"
          id="level"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="position">Position:</label>
        <input
          className="form-control"
          defaultValue={employee ? employee.position : null}
          name="position"
          id="position"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Equipment:</label>
        {equipmentError && <div className="text-danger" role="alert">{equipmentError}</div>}
        <select className="form-control" name="equipment" value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)}>
          <option value="N/A">None</option>
          {equipments.map(equipment => (<option key={equipment.name} value={equipment.name.toLowerCase()}>{equipment.name}</option>))}
        </select >
      </div>

      <div className="d-flex justify-content-start gap-3">
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {employee ? "Update Employee" : "Create Employee"}
        </button>

        <button className="btn btn-danger" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
