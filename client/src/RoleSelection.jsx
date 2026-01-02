// client/src/RoleSelection.jsx

import React from 'react';
import './Web3Login.css'; // Reusing your existing styles

// --- IMPORT YOUR IMAGES HERE ---
import patientIcon from './assets/patient.png'; 
import doctorIcon from './assets/doctor.png';
import headerLogo from './assets/HeaderLogo.png';

// This component will contain the logic from your current Web3Login.jsx
// and receive the login function as a prop.

function RoleSelection({ startWeb3Login }) {
  // We use the existing web3-card-neon styles for the main container
  return (
    <div className="web3-card-neon" style={{padding: '20px', maxWidth: '800px'}}>
      
        {/* --- Header (Logo) --- */}
        <div className="header-logo-container">
            <img src={headerLogo} alt="DiagnoChain Logo" className="header-logo-image" />
        </div>
      
      {/* --- Selection Cards --- */}
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '40px' }}>
        
        {/* Patient Card */}
        <div 
            className="web3-card-role"
            onClick={() => startWeb3Login('patient')}
            role="button"
        >
            <div className="role-image-placeholder">
                <img src={patientIcon} alt="Patient Role" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
            </div>
            <p>Patient</p>
        </div>

        {/* Doctor Card */}
        <div 
          className="web3-card-role"
          onClick={() => startWeb3Login('doctor')} // Role sent here
          role="button"
        >
          {/* Placeholder for the 3D Doctor image */}
          <div className="role-image-placeholder">
            <img src={doctorIcon} alt="Doctor Role" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
          </div>
          <p>Doctor</p>
        </div>

      </div>
      
      <p className="info-text" style={{ marginTop: '20px', color: '#6A6A6A' }}>
        Click your role to connect your Web3 wallet.
      </p>
    </div>
  );
}

export default RoleSelection;