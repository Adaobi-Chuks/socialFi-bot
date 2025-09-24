import React, { useContext } from "react";
import { Route, Navigate, useNavigate, Outlet } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  return !localStorage.authId ? <Navigate to="/" /> : <Outlet />;
};

export default PrivateRoute;
