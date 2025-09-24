import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { DynamicContextProvider ,DynamicWidget} from "@dynamic-labs/sdk-react-core";

createRoot(document.getElementById("root")).render(
    <DynamicContextProvider
      settings={{
        environmentId:  import.meta.env.VITE_DYNAMIC_ENV_ID,
        walletConnectors: [],
      }}
    >
      <App />
    </DynamicContextProvider>
);
