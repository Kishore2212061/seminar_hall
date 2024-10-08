import React from "react";
import "../styles/Auth.css";

const AppLayout = ({ children }) => {
  return (
    <div className="flex-container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{
        background: "#f8f9fa",
        textAlign: "center",
        padding: "10px"
      }}>
        <h1>NATIONAL ENGINEERING COLLEGE</h1>
      </header>

      {/* Main Content */}
      <main style={{ flex: "1", margin: "10px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        {children} {/* Render child components here */}
      </main>

      {/* Footer */}
      <footer style={{
        background: "#343a40",
        color: "#ffffff",
        textAlign: "center",
        padding: "10px",
        width: "100%"
      }}>
        <p>© KISHORE KUMAR J 2024 | ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
};

export default AppLayout;
