import React, { useState, useEffect } from 'react';
import './Web3Login.css';
import defaultProfilePic from './assets/defaultprofilepic.png';

function RegistrationForm({ walletAddress, preselectedRole, onRegistrationComplete, onCancel }) {
    const [formData, setFormData] = useState({
        fullName: '',
        nric: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        role: preselectedRole, // Pre-filled from role selection
        profilePicture: null, // Will be set from default image
        medicalLicenseNumber: '',
        specialization: '',
        yearsOfExperience: '',
        boardCertifications: '',
        educationalHistory: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Convert default profile picture to base64 on mount
    useEffect(() => {
        const convertImageToBase64 = async () => {
            try {
                const response = await fetch(defaultProfilePic);
                const blob = await response.blob();
                const reader = new FileReader();

                reader.onloadend = () => {
                    setFormData(prev => ({
                        ...prev,
                        profilePicture: reader.result
                    }));
                };

                reader.readAsDataURL(blob);
            } catch (error) {
                console.error('Error converting default image:', error);
            }
        };

        convertImageToBase64();
    }, []);

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log('Submitting registration with profile picture:', !!formData.profilePicture);

            const response = await fetch('http://localhost:3001/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: walletAddress.toLowerCase(),
                    ...formData
                })
            });

            const data = await response.json();

            if (data.status === 'Success') {
                console.log('Registration successful, user data:', data.user);
                // Registration successful
                onRegistrationComplete(data.user);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="registration-container">
            <div className="web3-card-neon" style={{ maxWidth: '500px' }}>
                {/* Header Logo - Update this path to match your actual logo location */}
                <div className="header-logo-container">
                    <h2 style={{ color: '#00e0ff', marginBottom: '10px' }}>DiagnoChain</h2>
                </div>

                <h1>Complete Your Profile</h1>
                <p className="info-text">Welcome! Please provide your details to continue as a {preselectedRole}.</p>

                <form onSubmit={handleSubmit} className="registration-form">
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className="form-group">
                        <label>NRIC / Passport Number *</label>
                        <input
                            type="text"
                            name="nric"
                            value={formData.nric}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                            placeholder="123456-78-9012"
                        />
                    </div>

                    <div className="form-group">
                        <label>Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                            placeholder="your.email@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            className="form-input"
                            placeholder="+60123456789"
                        />
                    </div>

                    <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            className="form-input"
                        />

                    </div>

                    {/* Doctor Specific Fields */}
                    {preselectedRole === 'doctor' && (
                        <>
                            <div className="form-group">
                                <label>Medical License Number *</label>
                                <input
                                    type="text"
                                    name="medicalLicenseNumber"
                                    value={formData.medicalLicenseNumber}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    placeholder="e.g., MD123456"
                                />
                            </div>

                            <div className="form-group">
                                <label>Specialization *</label>
                                <input
                                    type="text"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    placeholder="e.g., Cardiology"
                                />
                            </div>

                            <div className="form-group">
                                <label>Years of Experience *</label>
                                <input
                                    type="number"
                                    name="yearsOfExperience"
                                    value={formData.yearsOfExperience}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    placeholder="e.g., 10"
                                />
                            </div>

                            <div className="form-group">
                                <label>Board Certifications</label>
                                <input
                                    type="text"
                                    name="boardCertifications"
                                    value={formData.boardCertifications}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="ABIM, ABFM (comma-separated)"
                                />
                            </div>

                            <div className="form-group">
                                <label>Educational History *</label>
                                <textarea
                                    name="educationalHistory"
                                    value={formData.educationalHistory}
                                    onChange={handleInputChange}
                                    required
                                    className="form-input"
                                    rows="3"
                                    placeholder="M.D. - Harvard Medical School, 2010"
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </>
                    )}

                    {/* Role is pre-selected and read-only */}
                    <div className="form-group">
                        <label>Role</label>
                        <input
                            type="text"
                            value={preselectedRole.charAt(0).toUpperCase() + preselectedRole.slice(1)}
                            readOnly
                            className="form-input"
                            style={{ backgroundColor: '#252530', cursor: 'not-allowed' }}
                        />
                    </div>

                    <div className="wallet-display">
                        <p className="info-text">Wallet Address:</p>
                        <p className="wallet-address-text">{walletAddress}</p>
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="web3-button"
                            style={{
                                backgroundColor: '#6c757d',
                                flex: 1
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="web3-button"
                            disabled={loading}
                            style={{ flex: 2 }}
                        >
                            {loading ? 'Registering...' : 'Complete Registration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RegistrationForm;