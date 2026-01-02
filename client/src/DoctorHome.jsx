// client/src/DoctorHome.jsx

import React, { useState, useEffect } from 'react';
import './Web3Login.css';

// Import components
import DoctorAppointments from './DoctorAppointments';
import CaseDetails from './CaseDetails';
import DoctorProfile from './DoctorProfile';

// Import assets
import headerLogo from './assets/HeaderLogo.png';
import defaultProfilePic from './assets/defaultprofilepic.png';

const API_BASE_URL = 'http://localhost:3001';

function DoctorHome({ walletAddress, userData }) {
    const [currentView, setCurrentView] = useState('dashboard');

    // Listen for hash changes to handle "View Appointments" link
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash === 'appointments') {
                setCurrentView('appointments');
                window.location.hash = ''; // Clear the hash
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Get current date and time
    const getCurrentDateTime = () => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = now.toLocaleDateString('en-US', options);
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return { date, time };
    };

    const { date, time } = getCurrentDateTime();

    const handleLogout = () => { window.location.href = '/'; };

    // Sidebar items for doctor
    const sidebarItems = [
        {
            name: 'Dashboard',
            icon: '',
            view: 'dashboard',
            action: () => setCurrentView('dashboard')
        },
        {
            name: 'Case Details',
            icon: '',
            view: 'cases',
            action: () => setCurrentView('cases')
        },
        {
            name: 'Patients',
            icon: '',
            view: 'patients',
            action: () => setCurrentView('patients')
        },
        {
            name: 'Appointments',
            icon: '',
            view: 'appointments',
            action: () => setCurrentView('appointments')
        },
        {
            name: 'Profile',
            icon: '',
            view: 'profile',
            action: () => setCurrentView('profile')
        },
        {
            name: 'Logout',
            icon: '',
            action: handleLogout
        },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#0d3b4d' }}>

            {/* Sidebar */}
            <div className="sidebar">
                <div className="logo-container">
                    <img src={headerLogo} alt="Logo" className="sidebar-logo" />
                </div>
                <div className="menu-list">
                    {sidebarItems.map(item => (
                        <div
                            key={item.name}
                            className={`menu-item ${item.view && currentView === item.view ? 'active' : ''}`}
                            onClick={item.action || (() => console.log(item.name))}
                        >
                            <span style={{ marginRight: '10px' }}>{item.icon}</span>
                            {item.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">

                {/* Header Bar */}
                <div className="header-bar">
                    <div className="header-greeting">
                        Hello, Dr. {userData?.fullName?.split(' ')[1] || 'Doctor'}
                    </div>
                    <div className="header-user-info">
                        <span className="role-tag doctor-tag">Doctor</span>
                        <img
                            src={userData?.profilePicture || defaultProfilePic}
                            alt="Profile"
                            className="profile-image"
                            style={{ objectFit: 'cover' }}
                        />
                    </div>
                </div>

                {/* Content Body */}
                <div className="content-body">
                    {currentView === 'dashboard' && (
                        <CommandCenter
                            walletAddress={walletAddress}
                            userData={userData}
                            onNavigateToAppointments={() => setCurrentView('appointments')}
                            onNavigateToCases={() => setCurrentView('cases')}
                        />
                    )}

                    {currentView === 'patients' && (
                        <div className="coming-soon">
                            <h2>Patient List</h2>
                            <p>Coming soon...</p>
                        </div>
                    )}

                    {/* ✅ FIXED: Replace coming soon with actual DoctorAppointments component */}
                    {currentView === 'appointments' && (
                        <DoctorAppointments
                            walletAddress={walletAddress}
                            userData={userData}
                        />
                    )}

                    {currentView === 'cases' && (
                        <CaseDetails
                            walletAddress={walletAddress}
                            userData={userData}
                        />
                    )}

                    {currentView === 'profile' && (
                        <DoctorProfile
                            walletAddress={walletAddress}
                            userData={userData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Command Center Component (New Dashboard)
function CommandCenter({ walletAddress, userData, onNavigateToAppointments, onNavigateToCases }) {
    const [stats, setStats] = useState({
        pendingReviews: 0,
        appointmentRequests: 0,
        totalPatients: 0
    });
    const [verificationQueue, setVerificationQueue] = useState([]);
    const [incomingAppointments, setIncomingAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [walletAddress]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            console.log('🔄 Fetching Command Center Data...');

            // 1. Fetch Cases (for Verification Queue & Stats)
            const casesResponse = await fetch(`${API_BASE_URL}/api/cases`);
            const casesData = await casesResponse.json();

            let pendingCases = [];
            if (casesData.status === 'Success') {
                pendingCases = casesData.cases.filter(c => c.verificationStatus === 'Pending Verify');
                setVerificationQueue(pendingCases.slice(0, 5)); // Show top 5
            }

            // 2. Fetch Appointments (for Incoming List & Stats)
            const aptResponse = await fetch(`${API_BASE_URL}/api/doctors/${walletAddress.toLowerCase()}/appointments`);
            const aptData = await aptResponse.json();

            let pendingApts = [];
            let totalPatientsCount = 0; // Estimation based on unique patients in appointments

            if (aptData.status === 'Success') {
                const allApts = aptData.appointments || [];
                pendingApts = allApts.filter(a => a.status === 'Pending');

                // Get upcoming appointments (Pending or Confirmed, future dates)
                const now = new Date();
                const upcoming = allApts.filter(a => {
                    const aptDate = new Date(a.date);
                    return aptDate >= now || (aptDate.toDateString() === now.toDateString());
                }).sort((a, b) => new Date(a.date) - new Date(b.date));

                setIncomingAppointments(upcoming.slice(0, 5)); // Show top 5 upcoming

                // Estimate unique patients
                const uniquePatients = new Set(allApts.map(a => a.walletAddress));
                totalPatientsCount = uniquePatients.size;
            }

            // 3. Update Stats
            setStats({
                pendingReviews: pendingCases.length,
                appointmentRequests: pendingApts.length,
                totalPatients: totalPatientsCount + 5 // Fake base number + actual
            });

        } catch (error) {
            console.error('❌ Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'pending-tag';
            case 'Confirmed': return 'confirmed-tag';
            case 'Declined': return 'declined-tag';
            case 'Pending Verify': return 'pending-tag';
            case 'Verified': return 'confirmed-tag';
            default: return 'neutral-tag';
        }
    };

    return (
        <div className="command-center-container">
            <div className="command-header">
                <h1>Doctor's Command Center</h1>
                <p>Manage patient cases and schedules in one view.</p>
            </div>

            {/* Stats Row */}
            <div className="stats-card-row">
                <div className="stats-card">
                    <div className="stats-info">
                        <span className="stats-label">PENDING REVIEWS</span>
                        <span className="stats-value">{stats.pendingReviews}</span>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="stats-info">
                        <span className="stats-label">APPOINTMENT REQUESTS</span>
                        <span className="stats-value">{stats.appointmentRequests}</span>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="stats-info">
                        <span className="stats-label">TOTAL PATIENTS</span>
                        <span className="stats-value">{stats.totalPatients}</span>
                    </div>
                </div>
            </div>

            {/* Main Split View */}
            <div className="dashboard-split-view">

                {/* LEFT: Diagnosis Verification Queue */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <h3>Diagnosis Verification Queue</h3>
                        <span className="counter-badge">{stats.pendingReviews} Pending</span>
                    </div>

                    <div className="panel-table-container">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>PATIENT / DATE</th>
                                    <th>AI PREDICTION</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {verificationQueue.length > 0 ? (
                                    verificationQueue.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="patient-cell-primary">{item.patientName}</div>
                                                <div className="patient-cell-secondary">{new Date(item.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="highlight-text">{item.aiDiagnosis}</td>
                                            <td>
                                                <span className={`status-badge ${getStatusColor(item.verificationStatus)}`}>
                                                    PENDING REVIEW
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="action-link"
                                                    onClick={onNavigateToCases}
                                                >
                                                    View →
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="empty-state-cell">No pending verifications</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT: Incoming Appointments */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <h3>Incoming Appointments</h3>
                        <span className="counter-badge blue">{incomingAppointments.length} Upcoming</span>
                    </div>

                    <div className="panel-table-container">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>PATIENT / DETAILS</th>
                                    <th>REQUESTED TIME</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incomingAppointments.length > 0 ? (
                                    incomingAppointments.map(appt => (
                                        <tr key={appt.id}>
                                            <td>
                                                <div className="patient-cell-primary">{appt.patientName}</div>
                                                <div className="patient-cell-secondary">{appt.description || 'General Checkup'}</div>
                                            </td>
                                            <td>
                                                <div className="time-primary">{new Date(appt.date).toLocaleDateString()}</div>
                                                <div className="time-secondary">{appt.timeSlot}</div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getStatusColor(appt.status)}`}>
                                                    {appt.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="action-link"
                                                    onClick={onNavigateToAppointments}
                                                >
                                                    Manage →
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="empty-state-cell">No upcoming appointments</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default DoctorHome;