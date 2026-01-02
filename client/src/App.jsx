// ============================================
// FILE 3: client/src/App.jsx
// ============================================
import './Web3Login.css';
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import all required components
import RoleSelection from './RoleSelection';
import PatientHome from './PatientHome';
import DoctorHome from './DoctorHome';
import LoginGate from './LoginGate';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userData, setUserData] = useState(null);

  const refreshUserData = async () => {
    if (!walletAddress) return;
    try {
      const response = await fetch(`http://localhost:3001/api/user/${walletAddress}`);
      const data = await response.json();
      if (data.user) {
        setUserData(data.user);
      }
    } catch (error) {
      console.error("Failed to refresh user data", error);
    }
  };

  return (
    <Router>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#25496B'
      }}>
        <Routes>
          {/* --- Login/Selection Route --- */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to={`/${userRole}-home`} replace />
              ) : isLoggingIn ? (
                <LoginGate
                  role={userRole}
                  setIsAuthenticated={setIsAuthenticated}
                  setWalletAddress={setWalletAddress}
                  setUserRole={setUserRole}
                  setIsLoggingIn={setIsLoggingIn}
                  setUserData={setUserData}
                />
              ) : (
                <RoleSelection
                  startWeb3Login={(role) => {
                    setUserRole(role);
                    setIsLoggingIn(true);
                  }}
                />
              )
            }
          />

          {/* --- Patient Dashboard Route --- */}
          <Route
            path="/patient-home"
            element={
              isAuthenticated && userRole === 'patient' ? (
                <PatientHome
                  walletAddress={walletAddress}
                  userData={userData}
                  refreshUserData={refreshUserData}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* --- Doctor Dashboard Route --- */}
          <Route
            path="/doctor-home"
            element={
              isAuthenticated && userRole === 'doctor' ? (
                <DoctorHome
                  walletAddress={walletAddress}
                  userData={userData}
                  refreshUserData={refreshUserData}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;