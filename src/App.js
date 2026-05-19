import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import DriverLogin from "./pages/DriverLogin";

import Admin from "./pages/Admin";
import Driver from "./pages/Driver";
import Customer from "./pages/Customer";

import AdminRoute from "./components/AdminRoute";
import DriverRoute from "./components/DriverRoute";
import CustomerRoute from "./components/CustomerRoute";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/gg-admin-login" element={<AdminLogin />} />
        <Route path="/gg-driver-login" element={<DriverLogin />} />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        <Route
          path="/driver"
          element={
            <DriverRoute>
              <Driver />
            </DriverRoute>
          }
        />

        <Route
          path="/customer"
          element={
            <CustomerRoute>
              <Customer />
            </CustomerRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}