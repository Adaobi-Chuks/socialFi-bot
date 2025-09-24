import React, { useEffect } from "react";
import solanaLogo from "../../../assets/images/solanaLogo.png";
import headIcon from "../../../assets/images/headIcon.png";
import swap from "../../../assets/images/swap.svg";
import message from "../../../assets/images/message.svg";
import xIcon from "../../../assets/images/x.svg";
import globe from "../../../assets/images/globe.svg";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Link } from "react-router-dom";
import axios from "axios";

function Header() {
  const { user, setShowAuthFlow } = useDynamicContext();


  return (
    <header>
      <div className="txt">
        <h1>Trade, Tip & Transfer, made easy </h1>
        {/* <h1>Tip, Trade & Transfer in a Tap</h1> */}
        <p>
          Welcome to XFI your protocol for tipping on X (Twitter), swapping
          tokens, and sending messages globally. Powered by Sei. Built for
          speed.
        </p>
        {user ? (
          <Link to="/user" className="btn term">
            Launch Terminal
          </Link>
        ) : (
          <div className="btn term" onClick={() => setShowAuthFlow(true)}>
            Connect X
          </div>
        )}
        <div className="scroll_cont">
          <div className="scroll_down">
            <div className="icon"></div>
          </div>
          <p>scroll down</p>
        </div>
      </div>
      <div className="imgCont">
        <img src={globe} alt="" className="img1" />
        <img src={message} alt="" className="img2" />
        <img src={xIcon} alt="" className="img3" />
        <img src={swap} alt="" className="img4" />
      </div>
    </header>
  );
}

export default Header;
