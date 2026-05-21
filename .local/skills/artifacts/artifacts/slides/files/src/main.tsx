import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
<<<<<<< HEAD
import { Router } from "wouter";
=======
import { BrowserRouter } from "react-router-dom";
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f

import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
<<<<<<< HEAD
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <App />
    </Router>
=======
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  </StrictMode>,
);
