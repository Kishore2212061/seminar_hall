import React from "react";

const AppLayout = ({ children }) => {
  return (
    <div className="flex-container">
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{
        background: "#f8f9fa",
        padding: "10px",
        textAlign: "center"
      }}>
        <h1>NATIONAL ENGINEERING COLLEGE</h1>
      </header>

      {/* Main Content */}
      <main style={{ alignItems:"center",flex: "1", padding: "20px",margin:"10px",display:"flex"}}>
        {children} {/* Render child components here */}
      </main>

      {/* Footer */}
      <footer style={{
        background: "#343a40",
        color: "#ffffff",
        textAlign: "center",
        padding: "10px",
        bottom: 0,
        width: "100%",
      }}>
        <p>© KISHORE KUMAR J 2024 | ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
    </div>  
  );
};

export default AppLayout;
