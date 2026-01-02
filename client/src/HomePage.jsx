// client/src/HomePage.jsx

import React from 'react';
import './Web3Login.css'; // Use the same styles for aesthetics

function HomePage({ walletAddress }) {
  const shortAddress = walletAddress 
    ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
    : 'User';

  return (
    <div className="web3-card-neon" style={{padding: '60px'}}>
      <h1>Welcome Home, {shortAddress}!</h1>
      <p className="info-text" style={{color: '#48bb78', fontSize: '1rem'}}>
        You are now logged in and viewing secured content.
      </p>
      <button 
        className="web3-button" 
        onClick={() => {
            // A real app would clear the session token here
            window.location.href = '/'; 
        }}
        style={{ backgroundColor: '#e53e3e', marginTop: '20px' }}
      >
        LOGOUT (Back to Login)
      </button>
    </div>
  );
}

export default HomePage;