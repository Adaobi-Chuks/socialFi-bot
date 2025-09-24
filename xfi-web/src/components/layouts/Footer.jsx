import React, { useEffect, useState } from "react";
import { FaTelegramPlane } from "react-icons/fa";
import { FaRobot, FaXTwitter } from "react-icons/fa6";
import { useLocation } from "react-router-dom";
function Footer() {
  const [showFooter, setShowFooter] = useState(true);
  const location = useLocation();
  const { pathname } = location;

  useEffect(() => {
    if (pathname.includes("user") || pathname.includes("class")) {
      setShowFooter(false);
    } else {
      setShowFooter(true);
    }
  }, [pathname]);
  return showFooter ? (
    <footer>
      <a href="#" className="logo">
        <img src="logo.svg" alt="" />
      </a>
      <ul>
        <li>
          <a href="/#home">Home</a>
        </li>
        <li>
          <a href="/#howto">About</a>
        </li>
        {/* <li>
          <a href="#">Privacy Policy</a>
        </li> */}
      </ul>
      <ul>
        <li>
          <a href="https://x.com/xfi_seiBot" target="_blank" className="btx">
            <FaRobot />
          </a>
        </li>
        <li>
          <a href="https://x.com/xfi_sei" target="_blank" className="btx">
            <FaXTwitter />
          </a>
        </li>
      </ul>
    </footer>
  ) : (
    <></>
  );
}

export default Footer;
