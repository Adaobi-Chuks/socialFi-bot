import React, { useEffect, useState } from "react";
import "../../assets/css/userDashboard.css";
import Usernav from "../layouts/user/Usernav";
import dp from "../../assets/images/dp.jpg";
import dp2 from "../../assets/images/dp2.png";
import { ExternalLink } from "lucide-react";
import Chat from "../layouts/user/Chat";
import WalletSec from "../layouts/user/WalletSec";
import axios from "axios";
import { timeAgo, truncateMiddle } from "../utils/utils";

function Dasboard() {
  const [user, setUser] = useState(null);
  const [userBalance, setUserBalance] = useState([]);
  const [txs, setTxs] = useState([]);
  const [showPanel, setShowPanel] = useState(1);

  const tips = Array.from({ length: 20 }, (_, i) => i + 1);

  const getHistory = async () => {
    try {
      const authId = localStorage.getItem("authId");
      if (!authId) return;

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE}/api/users/history/${authId}`
      );
      setTxs(res.data);
    } catch (err) {
      console.error("Error fetching balances:", err);
      return {};
    }
  };
  const getBalances = async () => {
    try {
      const authId = localStorage.getItem("authId");
      if (!authId) return;
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE}/api/users/balance/${authId}`
      );

      //   const res = await axios.get(
      //     `${import.meta.env.VITE_API_BASE}/api/users/balance/1881784875478630400`
      //   );

      // make sure it's an array
      const balances = res.data || [];

      if (balances.length > 0) {
        let totalUsd = 0;

        balances.forEach((item) => {
          totalUsd += item.amount_usd_value;
        });

        // console.log("All balances:", balances);
        console.log("Total USD value:", totalUsd.toFixed(2));

        return { balances, totalUsd };
      } else {
        return { balances: [], totalUsd: 0 };
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
      return { balances: [], totalUsd: 0 };
    }
  };

  const fetchUserDetails = async () => {
    try {
      const authId = localStorage.getItem("authId");
      if (!authId) return;
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE}/api/users/${authId}`
      );
      setUser(res.data);

      await getHistory();

      /**@wWORKING_ON_GETTING_BALANCE */
        const rawUserBlanace = await getBalances();
    //   const rawUserBlanace = [];
      console.log(rawUserBlanace);

      setUserBalance(rawUserBlanace);
    } catch (error) {
      console.log(error);
    }
  };

  const setShowPanelFunc = (e) => {
    const no = e.target.getAttribute("data-index");
    setShowPanel(no);
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  return (
    <div className="userDashboard">
      <Usernav user={user} />

      <div className="header_btns">
        <div
          className={showPanel == 0 ? "btn active" : "btn"}
          data-index={0}
          onClick={setShowPanelFunc}
        >
          Activities
        </div>
        <div
          className={showPanel == 1 ? "btn active" : "btn"}
          data-index={1}
          onClick={setShowPanelFunc}
        >
          Terminal
        </div>
        <div
          className={showPanel == 2 ? "btn active" : "btn"}
          data-index={2}
          onClick={setShowPanelFunc}
        >
          My wallet
        </div>
      </div>
      <main
        className={
          showPanel == 0 ? "activty" : showPanel == 1 ? "chat" : "wallet"
        }
      >
        <div className="transactions">
          <h1>Transactions</h1>
          <div className="rows">
            {txs &&
              Array.from(txs, (tx) => (
                <a
                  key={tx._id}
                  href={`https://seitrace.com/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="messageBox"
                >
                  <img
                    src={user ? user?.profileImage : dp}
                    alt=""
                    className="dp"
                  />
                  {/* <h2>{tx.meta.originalCommand}</h2> */}
                  <h2>
                    {tx.meta.originalCommand.includes("buy")
                      ? tx.meta.originalCommand.replace(
                          /(0x[a-fA-F0-9]{40}|[A-Za-z0-9]{20,})/,
                          (match) => truncateMiddle(match)
                        )
                      : tx.meta.originalCommand.includes("tip")
                      ? tx.meta.originalCommand.replace(
                          /(0x[a-fA-F0-9]{40}|[A-Za-z0-9]{20,})/,
                          (match) => truncateMiddle(match)
                        )
                      : tx.meta.originalCommand}
                  </h2>
                  <h3>{timeAgo(tx.createdAt)}</h3>
                </a>
              ))}
          </div>
        </div>
        <Chat getHistory={getHistory} />

        <WalletSec user={user} userBalance={userBalance} />
      </main>
    </div>
  );
}

export default Dasboard;
