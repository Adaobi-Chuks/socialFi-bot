import React from "react";
import logo from "../../../assets/images/logo.png";
import dp from "../../../assets/images/dp.jpg";
import { BellDot } from "lucide-react";
import { Link } from "react-router-dom";

function Usernav({user}) {
  return (
    <div className="userNav">
      <Link to={"/"} className="logo">
        <img src={logo} alt="" />
      </Link>
      <ul>
        <li className="btn">LeaderBoard</li>
        <li className="notsBtn">
          <BellDot className="notsIcon"/>
        </li>
        <li className="dpCont">
          <img src={user ? user?.profileImage : dp} alt="dp" />
        </li>
      </ul>
    </div>
  );
}

export default Usernav;
