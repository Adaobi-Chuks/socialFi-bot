import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/layouts/Nav";
import Home from "./components/pages/Home";
import Footer from "./components/layouts/Footer";
import ScrollToTop from "./components/pages/ScrollToTop";
import { ToastContainer } from "react-toastify";
import Dasboard from "./components/pages/Dasboard";
import PrivateRoute from "./components/pages/PrivateRoute";
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'

function App() {
  return (
    <BrowserRouter>
      <div className="container">
        <Nav />
        <ToastContainer />
        <ScrollToTop />
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route element={<PrivateRoute />}>
            <Route exact path="/user" element={<Dasboard />} />
          </Route>
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

/**
 * The header, should have like solana interchanged
 */

export default App;
