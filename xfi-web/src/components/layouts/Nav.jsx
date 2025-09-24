import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import { CiUser } from "react-icons/ci";
import { MdLockOutline, MdEmail } from "react-icons/md";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa6";
import { HiMiniBars3BottomRight } from "react-icons/hi2";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import axios from "axios";

function Nav() {
  const userpopUpRef = useRef(null);
  const userpopUpRefChild = useRef(null);
  const mobileMenuRef = useRef(null);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [signIn, setSignIn] = useState(true);
  const [classSec, setClassSec] = useState(true);
  const location = useLocation();
  const { pathname } = location;
  //
  const { user } = useDynamicContext();

  const saveUserDetails = async (rawData) => {
    try {
      const token = localStorage.getItem("authId");
      if (token) return;

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE}/api/auth/login`,
        rawData
      );
      console.log("User saved ✅:", res.data);
      if (res.data.authenticated) {
        // console.log("User saved ✅:", res.data.user);
        localStorage.setItem("authId", res.data.user.userId);
      }
      return res.data;
    } catch (err) {
      console.error("Error saving user ❌:", err);
    }
  };
  useEffect(() => {
    if (!user) return;
    // console.log(user);
    if (user) {
      // console.log(user?.verifiedCredentials[0]?.oauthMetadata);
      const rawData = {
        userId: user?.verifiedCredentials[0]?.oauthMetadata?.id,
        userName: user?.verifiedCredentials[0]?.oauthMetadata?.username,
        profileImage:
          user?.verifiedCredentials[0]?.oauthMetadata?.profile_image_url,
      };
      console.log(rawData);
      if (!rawData.userId) return;
      saveUserDetails(rawData);
    }
  }, [user]);

  //
  const toggleMobileMenuPopUp = (e) => {
    e.preventDefault();
    mobileMenuRef.current.classList.toggle("active");
  };
  //
  const closeMobileMenuPopUp = (e) => {
    mobileMenuRef.current.classList.remove("active");
  };

  //

  useEffect(() => {
    if (pathname.includes("user") || pathname.includes("class")) {
      setClassSec(null);
    } else if (pathname.includes("instructor")) {
      setClassSec(null);
    } else {
      setClassSec(false);
    }
  }, [pathname]);

  return (
    <nav
      style={classSec === null ? { display: "none" } : { display: "flex" }}
      className={classSec ? "classSec" : ""}
      id="home"
    >
      <Link to="/" className="logo">
        <img src={logo} alt="" />
      </Link>
      <ul ref={mobileMenuRef}>
        <li>
          <a href="/#howto" onClick={closeMobileMenuPopUp}>
            About
          </a>
        </li>
        <li>
          <a href="/#why" onClick={closeMobileMenuPopUp}>
            Why
          </a>
        </li>
        <li>
          <a href="/#faq" onClick={closeMobileMenuPopUp}>
            Faq
          </a>
        </li>

        <Link to="sign" className="btn">
          <DynamicWidget />
        </Link>
      </ul>
      <HiMiniBars3BottomRight
        className="bars"
        onClick={toggleMobileMenuPopUp}
      />
    </nav>
  );
}

export default Nav;
