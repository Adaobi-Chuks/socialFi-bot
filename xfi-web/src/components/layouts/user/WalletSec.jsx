import React, { useEffect, useRef, useState } from "react";
import dp from "../../../assets/images/dp.jpg";
import { QRCodeCanvas } from "qrcode.react";
import { Eye, EyeOff } from "lucide-react";
import {
  formatTokenAmount,
  formatUsd,
  truncateMiddle,
} from "../../utils/utils";
// import "./WalletSec.css"; // 👈 import CSS file

const WalletSec = ({ user, userBalance }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [amount, setAmount] = useState(0);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [showAmount, setShowAmount] = useState(true);
  const [copied, setCopied] = useState(false);
  const balanceElementRef = useRef(null);

  const seedPhrase =
    "Garri Beans Water Block Gradunar Groundnut hook rate kwiriri milk tea spoon";

  const handleCopy = () => {
    navigator.clipboard.writeText(user ? user.walletAddress : "....");
    setCopied(true);

    // reset after 500ms
    setTimeout(() => setCopied(false), 1000);
  };

  function toggleBalance() {
    let showamount = !showAmount;
    const balanceElement = balanceElementRef.current;
    setShowAmount(showamount);
    if (showamount) {
      const formattedUsd = formatUsd(amount);
      balanceElement.textContent = `$${formattedUsd}`;
    } else {
      balanceElement.textContent = "••••";
    }
  }

  useEffect(() => {
    console.log(userBalance.totalUsd);
    // console.log(userBalance?.length );

    if (userBalance.totalUsd) {
      setAmount(userBalance.totalUsd);
    }
  }, [userBalance]);

  const ReceiveModal = () => (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Receive</h2>
          <button onClick={() => setActiveModal(null)} className="close-btn">
            ×
          </button>
        </div>

        <div className="qr-box">
          <QRCodeCanvas
            value={user ? user?.walletAddress : ""}
            size={160}
            fgColor={"#000"}
            level={"H"}
          />
        </div>

        <p className="wallet-text">Your wallet address:</p>

        <div className="wallet-address">
          <code>{truncateMiddle(user ? user?.walletAddress : "....")}</code>
        </div>

        <button
          onClick={handleCopy}
          className={`btn-copy ${copied ? "active" : ""}`}
        >
          {copied ? "Copied!" : "Copy Address"}
        </button>
      </div>
    </div>
  );

  const SeedPhraseModal = () => (
    <div className="modal-overlay seed-overlay">
      <div className="modal-container seed-container">
        <div className="modal-header">
          <h2>Seed Phrase</h2>
          <button onClick={() => setActiveModal(null)} className="close-btn">
            ×
          </button>
        </div>

        <div className="warning-box">
          <div className="warning-header">
            <span>⚠️</span>
            <strong>Warning</strong>
          </div>
          <p>
            Never share your seed phrase with anyone. Store it safely offline.
          </p>
        </div>

        {!showSeedPhrase ? (
          <div className="reveal-box">
            <div className="lock-icon">🔒</div>
            <p>
              Click below to reveal your Private Key. Make sure you're in a
              private location.
            </p>
            <button
              onClick={() => setShowSeedPhrase(true)}
              className="btn-reveal"
            >
              Reveal Seed Phrase
            </button>
          </div>
        ) : (
          <div>
            <h2 className="seed-words">
              Lorem, ipsum dolor sit amet consectetur adipisicing elit. Neque
              beatae odio corrupti numquam soluta sequi dolor animi omnis
              provident voluptatibus.
            </h2>

            <div className="seed-actions">
              <button
                onClick={() => {
                  setShowSeedPhrase(false);
                  setActiveModal(null);
                }}
                className="btn-close"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(seedPhrase);
                  alert("Seed phrase copied to clipboard!");
                }}
                className="btn-green"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="walletSec">
      {/* Header */}
      <div className="wallet-header">
        <div className="wallet-header-left">
          <div className="wallet-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-wallet"
            >
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
          </div>
          <span className="wallet-title">My Wallet</span>
        </div>
        <div className="wallet-header-right">
          {/* <button className="gift-btn">
            <sup>0</sup> 🎁
          </button> */}
          <button
            onClick={() => setActiveModal("seedPhrase")}
            className="gear-btn"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="wallet-card">
        <div className="wallet-card-bg" />

        <div className="wallet-card-top">
          <div
            onClick={() => setActiveModal("receive")}
            className="wallet-address-short"
          >
            {truncateMiddle(user ? user?.walletAddress : "....")} ›
            <span>{user ? user?.username : ""}</span>
          </div>
          <img
            src={user ? user?.profileImage : dp}
            alt=""
            className="wallet-dp"
          />
        </div>

        <div className="wallet-card-bottom">
          <div ref={balanceElementRef} className="wallet-balance">
            ${formatUsd(amount)}
          </div>
          <div className="wallet-toggle">
            {showAmount ? (
              <Eye size={30} className="eyesIcon" onClick={toggleBalance} />
            ) : (
              <EyeOff size={30} className="eyesIcon" onClick={toggleBalance} />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="wallet-actions">
        <button
          onClick={() => setActiveModal("receive")}
          className="recive-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-wallet"
          >
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
          </svg>
          <h3>Receive</h3>
        </button>
      </div>

      {/* Tabs */}
      <div className="wallet-tabs">
        <button className="tab-active">Tokens</button>
        <button className="tab-inactive">NFTs</button>
      </div>
      <div className="tokens">
        {userBalance.totalUsd &&
          userBalance.balances.map((item, idx) => (
            <a target="_blank" className="token-tab" key={idx}>
              <div className="first-cont">
                <img src={item.logo} alt="" />
                <h3>{item.name}</h3>
              </div>
              <div className="last-cont">
                <h3>${formatUsd(item.amount_usd_value)}</h3>
                <h4>{formatTokenAmount(item.raw_amount)} TKN</h4>
              </div>
            </a>
          ))}
      </div>

      {/* Modals */}
      {activeModal === "receive" && <ReceiveModal />}
      {activeModal === "seedPhrase" && <SeedPhraseModal />}
    </div>
  );
};

export default WalletSec;
