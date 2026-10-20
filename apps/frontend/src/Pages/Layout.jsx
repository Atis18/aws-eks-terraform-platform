import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../Context/AuthProvider";

const Layout = () => {
  const { user, signOut } = useAuth();
  const [show, setShow] = useState(false);

  return (
    <>
      <nav className="navbar navbar-expand-md bg-dark" data-bs-theme="dark">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand">
            Employee Madness
          </Link>
          <button
            className="navbar-toggler"
            onClick={() => setShow(!show)}
            type="button"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className={`collapse navbar-collapse ${show ? "show" : ""}`}>
            <ul className="navbar-nav">
              <li className="nav-item"></li>
              {user && (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/list">
                      Employees
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/employees">
                      Search
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/createEmployee">
                      Create Employee
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/equipments">
                      Equipments
                    </Link>
                  </li>
                </>
              )}
              {!user && (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/sign-in">Sign In</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/sign-up">Sign Up</Link>
                  </li>
                </>
              )}
            </ul>
            {user && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={signOut}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>
      <div className="container py-4 px-3 mx-auto">
        <Outlet />
      </div>
    </>
  );
};

export default Layout;
