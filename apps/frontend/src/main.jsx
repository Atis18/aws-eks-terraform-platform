import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Layout from "./Pages/Layout";
import ErrorPage from "./Pages/ErrorPage";
import Home from "./Pages/Home";
import EmployeeList from "./Pages/EmployeeList";
import EmployeeCreator from "./Pages/EmployeeCreator";
import EmployeeUpdater from "./Pages/EmployeeUpdater";
import SearchList from "./Pages/SearchList";
import EquipmentList from "./Pages/EquipmentList";
import EquipmentCreator from "./Pages/EquipmentCreator";
import EquipmentUpdater from "./Pages/EquipmentUpdater";
import SignIn from "./Pages/SignIn";
import SignUp from "./Pages/SignUp";

import Protected from "./Components/Protected";
import GuestsOnly from "./Components/GuestsOnly";
import AuthProvider from "./Context/AuthProvider";

import "./index.scss";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home />, },

      { path: "/list", element: <Protected> <EmployeeList /> </Protected> },
      { path: "/createEmployee", element: <Protected> <EmployeeCreator /> </Protected> },
      { path: "/updateEmployee/:id", element: <Protected> <EmployeeUpdater /> </Protected> },

      { path: "/employees/:search?", element: <Protected> <SearchList /> </Protected> },

      { path: "/equipments", element: <Protected> <EquipmentList /> </Protected> },
      { path: "/createEquipment", element: <Protected> <EquipmentCreator /> </Protected> },
      { path: "/updateEquipment/:id", element: <Protected> <EquipmentUpdater /> </Protected> },

      { path: "/sign-in", element: <GuestsOnly> <SignIn /> </GuestsOnly> },
      { path: "/sign-up", element: <GuestsOnly> <SignUp /> </GuestsOnly> }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
