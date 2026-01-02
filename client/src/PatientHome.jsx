// client/src/PatientHome.jsx - FIXED VERSION WITH USER DATA REFRESH

import React, { useState, useEffect } from 'react';
import './Web3Login.css';
import ChatInterface from './ChatInterface';
import DiagnosisHistory from './DiagnosisHistory';
import PatientProfile from './PatientProfile';
import PatientAppointments from './PatientAppointments';

// Make sure these assets exist in client/src/assets/
import headerLogo from './assets/HeaderLogo.png';
import personFigure from './assets/personFigure.png';
import defaultProfilePic from './assets/defaultprofilepic.png';

const API_BASE_URL = 'http://localhost:3001';

function PatientHome({ walletAddress, userData: initialUserData }) {
    // --- State Management ---
    const [currentView, setCurrentView] = useState('promo');
    const [userData, setUserData] = useState(initialUserData); // Local state for user data

    // States related to the Chat/Prediction feature
    const [symptoms, setSymptoms] = useState('');
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [predictionStatus, setPredictionStatus] = useState('Enter symptoms to begin analysis.');

    // Sync with prop changes
    useEffect(() => {
        if (initialUserData) {
            setUserData(initialUserData);
        }
    }, [initialUserData]);

    // Debug: Log when userData changes
    useEffect(() => {
        console.log('Current userData in header:', userData);
        console.log('Profile picture URL:', userData?.profilePicture?.substring(0, 50));
    }, [userData]);

    // Derived state for display
    const shortAddress = walletAddress
        ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
        : 'User';

    // --- UTILITY HANDLERS ---

    const resetPredictionState = () => {
        setSymptoms('');
        setPredictions([]);
        setLoading(false);
        setPredictionStatus('Enter symptoms to begin analysis.');
    };

    const handleLogout = () => { window.location.href = '/'; };

    // Function to refresh user data after profile update
    const refreshUserData = async () => {
        try {
            console.log('Refreshing user data for:', walletAddress);
            const response = await fetch(`${API_BASE_URL}/api/user/${walletAddress.toLowerCase()}`);
            const data = await response.json();

            if (data.exists) {
                console.log('Updated user data:', data.user);
                console.log('Has profile picture:', !!data.user.profilePicture);
                setUserData(data.user);
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    };

    // --- API HANDLER (Passed to ChatInterface) ---
    const getPrediction = async (symptomsText) => {
        if (!symptomsText.trim()) {
            setPredictionStatus('Please describe your symptoms before predicting.');
            return;
        }

        setLoading(true);
        setPredictions([]);
        setPredictionStatus('Sending symptoms to AI model...');

        try {
            const response = await fetch(`${API_BASE_URL}/api/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symptoms: symptomsText })
            });

            const data = await response.json();

            if (data.status === 'Success' && data.predictions) {
                setPredictions(data.predictions);
                setPredictionStatus('Prediction complete! Review the results below.');
            } else {
                setPredictionStatus(`Prediction failed: ${data.error || 'Server returned an unknown error.'}`);
            }

        } catch (error) {
            console.error("Prediction fetch failed:", error);
            setPredictionStatus('Error: Could not connect to prediction service.');
        } finally {
            setLoading(false);
        }
    };

    // --- UI DATA & VIEW SWITCHING LOGIC ---
    const sidebarItems = [
        {
            name: 'Dashboard',
            icon: '',
            view: 'promo',
            action: () => {
                resetPredictionState();
                setCurrentView('promo');
            }
        },
        {
            name: 'My Diagnosis',
            icon: '',
            view: 'history',
            action: () => {
                resetPredictionState();
                setCurrentView('history');
            }
        },
        {
            name: 'My Appointments',
            icon: '',
            action: () => {
                resetPredictionState();
                setCurrentView('appointments'); // ✅ Actually changes view
            }
        },
        {
            name: 'My Profile',
            icon: '',
            view: 'profile',
            action: () => {
                resetPredictionState();
                setCurrentView('profile');
            }
        },

        {
            name: 'Logout',
            icon: '',
            action: handleLogout
        },
    ];

    // --- DASHBOARD DATA MANAGEMENT ---
    const [dashboardMetrics, setDashboardMetrics] = useState({
        healthScore: 100,
        lastCheckupDate: 'No Checkups',
        recentActivity: [],
        nextAppointment: null
    });

    // State to control auto-opening of appointment modal
    const [autoOpenBooking, setAutoOpenBooking] = useState(false);

    const fetchDashboardMetrics = async () => {
        try {
            // 1. Fetch Diagnosis History
            const historyResponse = await fetch(`${API_BASE_URL}/api/history/${walletAddress.toLowerCase()}`);
            let calculatedScore = 100;
            let lastCheckup = 'No Checkups';
            let recentActivity = [];

            if (historyResponse.ok) {
                const data = await historyResponse.json();
                if (data.status === 'Success' && data.history) {
                    const history = data.history;
                    const diseaseCount = history.length;
                    calculatedScore = Math.max(0, 100 - (diseaseCount * 10));

                    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
                    lastCheckup = sortedHistory.length > 0
                        ? new Date(sortedHistory[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'No Checkups';

                    recentActivity = sortedHistory.slice(0, 3);
                }
            }

            // 2. Fetch Appointments for Next Appointment Card
            let nextAppt = null;
            try {
                const appResponse = await fetch(`${API_BASE_URL}/api/appointments/${walletAddress.toLowerCase()}`);
                if (appResponse.ok) {
                    const appData = await appResponse.json();
                    if (appData.status === 'Success' && appData.appointments) {
                        const now = new Date();
                        // Filter for future appointments (today or later)
                        const future = appData.appointments
                            .filter(app => {
                                const appDate = new Date(app.date);
                                // Set app date to end of day to include appointments happening today
                                appDate.setHours(23, 59, 59, 999);
                                return appDate >= now;
                            })
                            .sort((a, b) => new Date(a.date) - new Date(b.date));

                        if (future.length > 0) {
                            nextAppt = future[0];
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching appointments for dashboard:', error);
            }

            setDashboardMetrics({
                healthScore: calculatedScore,
                lastCheckupDate: lastCheckup,
                recentActivity: recentActivity,
                nextAppointment: nextAppt
            });

        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
        }
    };

    useEffect(() => {
        fetchDashboardMetrics();
    }, [walletAddress, userData]); // Re-fetch when user or wallet changes



    // --- RENDER START ---
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#25496B', overflow: 'hidden' }}>

            {/* 1. Fixed Sidebar */}
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

            {/* 2. Main Content Area */}
            <div className="main-content">

                {/* 2a. Header Bar */}
                <div className="header-bar">
                    <div className="header-greeting">
                        Hello, {userData?.fullName || 'User'}
                    </div>
                    <div className="header-user-info">
                        <span className="role-tag patient-tag">Patient</span>
                        <img
                            key={userData?.profilePicture || 'default'}
                            src={userData?.profilePicture || defaultProfilePic}
                            alt="Profile"
                            className="profile-image"
                            style={{ objectFit: 'cover' }}
                            onError={(e) => {
                                console.log('Image load error, using fallback');
                                e.target.src = defaultProfilePic;
                            }}
                        />
                    </div>
                </div>

                {/* 2b. Body Content (Conditional Rendering) */}
                <div className="content-body" style={currentView === 'history' ? { maxWidth: '100%', paddingRight: '30px', paddingLeft: '60px' } : {}}>
                    {/* 1. RENDER CHAT INTERFACE */}
                    {currentView === 'chat' && (
                        <ChatInterface
                            getPrediction={getPrediction}
                            symptoms={symptoms}
                            setSymptoms={setSymptoms}
                            predictions={predictions}
                            loading={loading}
                            predictionStatus={predictionStatus}
                        />
                    )}

                    {/* 2. RENDER DIAGNOSIS HISTORY */}
                    {currentView === 'history' && (
                        <DiagnosisHistory
                            walletAddress={walletAddress}
                            onMakeAppointment={() => {
                                setAutoOpenBooking(true);
                                setCurrentView('appointments');
                            }}
                        />
                    )}

                    {/* 3. RENDER PROFILE PAGE */}
                    {currentView === 'profile' && (
                        <PatientProfile
                            walletAddress={walletAddress}
                            userData={userData}
                            onProfileUpdate={() => {
                                refreshUserData();
                                fetchDashboardMetrics(); // Refresh stats on profile update too
                            }}
                        />
                    )}

                    {/* 4. RENDER APPOINTMENTS PAGE */}
                    {currentView === 'appointments' && (
                        <PatientAppointments
                            walletAddress={walletAddress}
                            userData={userData}
                            initialOpen={autoOpenBooking}
                            onAppointmentCreated={refreshUserData}
                        />
                    )}

                    {/* 5. RENDER DASHBOARD (Redesigned) */}
                    {currentView === 'promo' && (
                        <div className="dashboard-container">
                            {/* Top Stats Row */}
                            <div className="dashboard-stats-row">
                                <div className="dashboard-card health-score-card">
                                    <div className="card-label">HEALTH SCORE</div>
                                    <div className="score-value" style={{ color: dashboardMetrics.healthScore < 50 ? '#c53030' : '#2f855a' }}>
                                        {dashboardMetrics.healthScore}%
                                    </div>
                                    <div className="score-tag" style={{
                                        backgroundColor: dashboardMetrics.healthScore < 50 ? '#fed7d7' : '#c6f6d5',
                                        color: dashboardMetrics.healthScore < 50 ? '#c53030' : '#2f855a'
                                    }}>
                                        AI Estimate
                                    </div>
                                </div>

                                <div className="dashboard-card checkup-card">
                                    <div className="card-label">LAST CHECKUP</div>
                                    <div className="checkup-date">{dashboardMetrics.lastCheckupDate}</div>
                                    <div className="checkup-tag">Date Checked</div>
                                </div>

                                <div className="dashboard-card appointment-card">
                                    <div className="card-label">NEXT APPOINTMENT</div>
                                    <div className="appointment-info">
                                        {dashboardMetrics.nextAppointment
                                            ? `${new Date(dashboardMetrics.nextAppointment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${dashboardMetrics.nextAppointment.timeSlot})`
                                            : 'No upcoming appointments'}
                                    </div>
                                    <div className="appointment-tag">Upcoming</div>
                                </div>
                            </div>

                            {/* Middle Section */}
                            <div className="dashboard-middle-section">
                                {/* Left: CTA Card */}
                                <div className="cta-card-gradient">
                                    <div className="cta-content">
                                        <h2>Feeling Unwell?</h2>
                                        <p>Our AI-powered system can analyze your symptoms in seconds.</p>
                                        <button
                                            className="cta-button"
                                            onClick={() => {
                                                resetPredictionState();
                                                setCurrentView('chat');
                                            }}
                                        >
                                            Start New Diagnosis
                                        </button>
                                    </div>
                                    {/* Restored Image */}
                                    <div className="cta-image-container">
                                        <img src={personFigure} alt="Doctor" className="person-figure-restored" />
                                    </div>
                                </div>

                                {/* Right: Tips & Profile */}
                                <div className="dashboard-right-col">
                                    <div className="dashboard-card tip-card">
                                        <div className="tip-header">Daily Tip</div>
                                        <p className="tip-text">"Drink 8 glasses of water today!"</p>
                                    </div>

                                    <div className="dashboard-card profile-summary-card">
                                        <div className="card-label">Your Profile</div>
                                        <div className="profile-summary-row">
                                            <div className="profile-avatar-small">
                                                <img
                                                    src={userData?.profilePicture || defaultProfilePic}
                                                    alt="Profile"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                                />
                                            </div>
                                            <div className="profile-details-text">
                                                <div className="profile-name">{userData?.fullName || 'User'}</div>
                                                <div className="profile-id">ID: #{walletAddress.substring(2, 6)}</div>
                                            </div>
                                        </div>
                                        <button
                                            className="manage-profile-btn"
                                            onClick={() => setCurrentView('profile')}
                                        >
                                            Manage Profile
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom: Recent Activity */}
                            <div className="dashboard-card recent-activity-card">
                                <div className="card-header-row">
                                    <h3>Recent Activity</h3>
                                    <button
                                        className="view-all-btn"
                                        onClick={() => setCurrentView('history')}
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="recent-activity-table-wrapper">
                                    <table className="recent-activity-table">
                                        <thead>
                                            <tr>
                                                <th>Diagnosis</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardMetrics.recentActivity.length > 0 ? (
                                                dashboardMetrics.recentActivity.map((activity, index) => (
                                                    <tr key={index}>
                                                        <td>{activity.prediction}</td>
                                                        <td>{new Date(activity.date).toLocaleDateString()}</td>
                                                        <td>
                                                            <span className={`status-pill ${activity.verificationStatus === 'Verified' ? 'approved' : 'pending'
                                                                }`}>
                                                                {activity.verificationStatus || 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" style={{ textAlign: 'center', color: '#a0aec0' }}>
                                                        No recent activity found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PatientHome;