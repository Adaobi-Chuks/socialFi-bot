import React from "react";
import Header from "../layouts/home/Header";
import "../../assets/css/home.css";
import Why from "../layouts/home/Why";
import Newsletter from "../layouts/home/Newsletter";
import { ToastContainer } from "react-toastify";
import Howto from "../layouts/home/Howto";
import Faq from "../layouts/home/Faq";

function Home() {
  return (
    <div className="home">
      <Header />
      <Howto />
      <Why />
      <Faq />
      <Newsletter />
    </div>
  );
}

export default Home;
