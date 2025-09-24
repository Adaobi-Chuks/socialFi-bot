import axios from "axios";
import { Send } from "lucide-react";
import React, { useEffect, useState } from "react";

const Chat = ({ getHistory }) => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const tradingOptions = [
    "Tip 0.01 sei to ekete.eth",
    "Send $5 to @xDeployer on X",
    "tip 0.2 SEI to 0xD81e692C35b480Be9E237Ac9E13828656619C8B6",
    "Sell all of my coins where my total balance is worth less than $5",
    "buy 0x95597eb8d227a7c4b4f5e807a815c5178ee6dbe1 for 0.01 SEI",
    "buy MILLI FOR 50 SEI",
    "sell all of $MILLI",
  ];

  const handleSendMessage = async () => {
    try {
      const authId = localStorage.getItem("authId");
      if (!authId) return;

      if (inputValue.trim() === "") return;

      const userMessage = {
        id: Date.now(),
        text: inputValue,
        sender: "user",
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsTyping(true);

      const requestBody = {
        userId: authId,
        prompt: inputValue,
      };

      console.log(requestBody);

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE}/api/bot-command`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (res) {
        console.log(res.data.response);
        const xFiResponse = {
          id: Date.now() + 1,
          text: res.data.response,
          sender: "xFi",
        };
        setMessages((prev) => [...prev, xFiResponse]);
        setIsTyping(false);
        if (
          !res.data.response.includes(
            "if you’re trying to use a command or just curiou"
          )
        ) {
          getHistory();
        }
      }

      setIsTyping(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOptionClick = (option) => {
    setInputValue(option);
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-logo">🤖</div>
        <div className="chat-title">gm, how can I help you?</div>
      </div>

      {/* Messages Area */}
      {messages.length > 0 && (
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.sender}`}>
              <div className="message-content">
                <div className="message-sender">
                  {message.sender === "user" ? "You" : "xFi"}
                </div>
                <div className="message-text">
                  {message.text.split(urlRegex).map((part, idx) => {
                    if (part.match(urlRegex)) {
                      return (
                        <a
                          key={idx}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ wordBreak: "break-all" }}
                        >
                          {part}
                        </a>
                      );
                    }
                    return part; // normal text
                  })}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message ai">
              <div className="message-content">
                <div className="message-sender">xFi</div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Options - only show when no messages */}
      {messages.length === 0 && (
        <div className="chat-options">
          {tradingOptions.map((option, index) => (
            <div
              key={index}
              className="chat-option"
              onClick={() => handleOptionClick(option)}
            >
              <span className="chat-option-arrow">&gt;</span>
              <span className="chat-option-text">{option}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-box">
          <span className="chat-prefix">//</span>
          <input
            type="text"
            placeholder="what's up?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="chat-input"
          />
          <button className="chat-send-btn" onClick={handleSendMessage}>
            <Send className="icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
