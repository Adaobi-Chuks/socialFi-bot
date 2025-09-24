import React from "react";
import vd from "../../../assets/videos/Demo.mp4";

function Howto() {
  return (
    <div className="howto" id="howto">
      <div className="cont">
        <video src={vd} muted autoPlay loop></video>
      </div>
    </div>
  );
}

export default Howto;
