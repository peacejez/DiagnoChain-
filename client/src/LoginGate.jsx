// ============================================
// FILE 2: client/src/LoginGate.jsx
// ============================================
import React, { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import RegistrationForm from './RegistrationForm';
import './Web3Login.css';

const API_BASE_URL = 'http://localhost:3001'; 

function LoginGate({ role, setIsAuthenticated, setWalletAddress, setUserRole, setIsLoggingIn, setUserData }) {
  const [status, setStatus] = useState(`Logging in as ${role}...`);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const showNotification = (title, description, isSuccess) => {
    console.log(`[${isSuccess ? 'SUCCESS' : 'FAILURE'}] ${title}: ${description}`);
    alert(`${title}\n${description}`); 
  };

  // Check if user exists in database
  const checkUserExists = async (address) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/${address.toLowerCase()}`);
      const data = await response.json();
      
      if (data.exists) {
        console.log('Existing user found:', data.user);
        return data.user;
      } else {
        console.log('New user detected');
        return null;
      }
    } catch (error) {
      console.error('Error checking user:', error);
      return null;
    }
  };

  const login = async (provider, address) => {
    try {
      // 1. Get Challenge/Message
      setStatus('Fetching challenge...');
      const challengeRes = await fetch(`${API_BASE_URL}/api/challenge?address=${address}`);
      const { message } = await challengeRes.json();

      // 2. Sign Message
      setStatus('Awaiting signature in your wallet...');
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // 3. Authenticate
      setStatus('Verifying signature on server...');
      const authRes = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature })
      });

      if (authRes.ok) {
        // Get full user data
        const userData = await checkUserExists(address);
        
        // --- SUCCESS LOGIC ---
        setStatus('Login SUCCESSFUL! Redirecting to dashboard... 🎉');
        showNotification('Login Successful!', `Redirecting to ${role} dashboard.`, true);
        
        // **TRIGGER THE REDIRECT IN APP.JSX**
        setWalletAddress(address); 
        setUserRole(role);
        setUserData(userData);
        setIsAuthenticated(true);

      } else {
        const errorData = await authRes.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
    } catch (error) {
      console.error("Login process failed:", error);
      setStatus(`Login FAILED: ${error.message}`);
      showNotification('Login Failed.', error.message || 'Server failed to verify signature.', false);
      
      // Reset state
      setIsAuthenticated(false);
      setUserRole(null); 
      setIsLoggingIn(false);
    }
  };

  const handleRegistrationComplete = async (newUser) => {
    console.log('Registration completed:', newUser);
    setShowRegistration(false);
    setStatus('Registration complete! Proceeding to login...');
    
    // After registration, proceed with signature verification
    await login(currentProvider, currentAddress);
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus('Install MetaMask or another wallet!');
      showNotification('Wallet Required.', 'Please install MetaMask to proceed.', false);
      return;
    }

    try {
      setStatus('Connecting wallet...');
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      
      setCurrentAddress(address);
      setCurrentProvider(provider);

      // Check if user exists
      setStatus('Checking user registration...');
      const existingUser = await checkUserExists(address);

      if (existingUser) {
        // User exists - check if role matches
        if (existingUser.role !== role) {
          setStatus(`Error: This wallet is registered as ${existingUser.role}`);
          showNotification(
            'Role Mismatch',
            `This wallet is registered as a ${existingUser.role}. Please select the correct role.`,
            false
          );
          setIsLoggingIn(false);
          return;
        }
        
        // Proceed with login
        await login(provider, address);
      } else {
        // New user - show registration form
        setStatus('New user detected. Please complete registration.');
        setShowRegistration(true);
      }

    } catch (error) {
      console.error("Wallet connection failed:", error);
      setStatus('Connection failed.');
      showNotification('Connection Failed.', error.message || "Could not connect to wallet.", false);
      setIsLoggingIn(false);
    }
  };

  // Run the login process as soon as the component loads
  useEffect(() => {
    connectWallet();
  }, []); 

  // Show registration form if needed
  if (showRegistration && currentAddress) {
    return (
      <RegistrationForm
        walletAddress={currentAddress}
        preselectedRole={role}
        onRegistrationComplete={handleRegistrationComplete}
        onCancel={() => {
          setShowRegistration(false);
          setIsLoggingIn(false);
        }}
      />
    );
  }

  // Simple UI feedback while the process is running
  return (
    <div className="web3-card-neon" style={{padding: '40px', maxWidth: '400px'}}>
      <h1>Web3 Login Gate</h1>
      <p className="info-text">Role: {role.toUpperCase()}</p>
      <span className="status-tag status-default" style={{backgroundColor: '#1464A5'}}>
        Status: {status}
      </span>
      {status.includes('Install MetaMask') && (
        <p className="info-text" style={{ color: '#e53e3e', marginTop: '10px' }}>
            Please install MetaMask to proceed.
        </p>
      )}
    </div>
  );
}

export default LoginGate;