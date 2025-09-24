import React, { useRef } from "react";
import questionnaire from "../../../assets/images/questionnaire.svg";
function Faq() {
  const boxRefs = useRef([]);
  const toggleFaq = (e) => {
    const tagName = e.target.tagName.toUpperCase(); // Convert to upper case

    if (tagName.includes("DIV")) {
      const cont = e.target;
      boxRefs.current.forEach((tx, id) => {
        if (
          tx.classList.contains("active") &&
          !cont.classList.contains("active")
        ) {
          tx.classList.remove("active");
        }
      });
      cont.classList.toggle("active");
    }
    if (tagName.includes("LI")) {
      const cont = e.target.parentNode;
      boxRefs.current.forEach((tx, id) => {
        if (
          tx.classList.contains("active") &&
          !cont.classList.contains("active")
        ) {
          tx.classList.remove("active");
        }
      });
      cont.classList.toggle("active");
    }

    console.log(tagName);

    if (tagName.includes("H2")) {
      const cont = e.target.parentNode.parentNode;
      boxRefs.current.forEach((tx, id) => {
        if (
          tx.classList.contains("active") &&
          !cont.classList.contains("active")
        ) {
          tx.classList.remove("active");
        }
      });
      cont.classList.toggle("active");
    }
    if (tagName.includes("P")) {
      const cont = e.target.parentNode;
      boxRefs.current.forEach((tx, id) => {
        if (
          tx.classList.contains("active") &&
          !cont.classList.contains("active")
        ) {
          tx.classList.remove("active");
        }
      });
      console.log(cont);
      cont.classList.toggle("active");
    }
  };
  return (
    <section className="faq" id="faq">
      <h1>Faq</h1>
      <h3>Dive into our comprehensive FAQ where we cover everything</h3>
      <div className="rows">
        <div
          className="box"
          ref={(el) => (boxRefs.current[0] = el)}
          onClick={toggleFaq}
        >
          <li className="btn">
            <h2>
              <img src={questionnaire} alt="" />
             What is XFI?
            </h2>
            <h2 className="icon">
              <span></span>
              <span></span>
            </h2>
          </li>
          <p>
            XFI is a decentralized protocol that lets you send tips on X (Twitter), swap tokens instantly, and message anyone across the globe using Solana’s fast blockchain.
          </p>
        </div>
        <div
          className="box"
          ref={(el) => (boxRefs.current[1] = el)}
          onClick={toggleFaq}
        >
          <li className="btn">
            <h2>
              <img src={questionnaire} alt="" />
              How do I tip someone on X?
            </h2>
            <h2 className="icon">
              <span></span>
              <span></span>
            </h2>
          </li>
          <p>
            Just connect your X account to our platform, deposit, send a message or post with the amount and tag, and send. If they don’t have a wallet yet, the funds are stored for them until they claim.
          </p>
        </div>
        <div
          className="box"
          ref={(el) => (boxRefs.current[2] = el)}
          onClick={toggleFaq}
        >
          <li className="btn">
            <h2>
              <img src={questionnaire} alt="" />
             Do I need a wallet to receive tips?
            </h2>
            <h2 className="icon">
              <span></span>
              <span></span>
            </h2>
          </li>
          <p>
         Not immediately! If you don’t have one, we hold your tips until you sign up and connect your x account.
          </p>
        </div>
        <div
          className="box"
          ref={(el) => (boxRefs.current[3] = el)}
          onClick={toggleFaq}
        >
          <li className="btn">
            <h2>
              <img src={questionnaire} alt="" />
              Can I tip in any token?
            </h2>{" "}
            <h2 className="icon">
              <span></span>
              <span></span>
            </h2>
          </li>
          <p>
           Yes, XFI supports multiple Sei tokens. You can even swap before sending if you’d like to tip in a specific token.
          </p>
        </div>
        <div
          className="box big"
          ref={(el) => (boxRefs.current[3] = el)}
          onClick={toggleFaq}
        >
          <li className="btn">
            <h2>
              <img src={questionnaire} alt="" />
              Is tipping free?
            </h2>{" "}
            <h2 className="icon">
              <span></span>
              <span></span>
            </h2>
          </li>
          <p>
          No middlemen fees! Only a minimal Sei network fee applies (~fractions of a cent).
          </p>
        </div>
        <div
          className="box big"
          ref={(el) => (boxRefs.current[3] = el)}
          onClick={toggleFaq}
        >
          <li className="btn">
            <h2>
              <img src={questionnaire} alt="" />
            Is it safe to use XFI?
            </h2>{" "}
            <h2 className="icon">
              <span></span>
              <span></span>
            </h2>
          </li>
          <p>
           Yes. All transactions happen directly on Sei — no funds are ever held by us. You control your wallet and private keys at all times.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Faq;
