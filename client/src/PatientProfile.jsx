// client/src/PatientProfile.jsx - COMPLETE FIXED VERSION

import React, { useState, useEffect, useRef } from 'react';
import './Web3Login.css';
import defaultProfilePic from './assets/defaultprofilepic.png';

const API_BASE_URL = 'http://localhost:3001';

function PatientProfile({ walletAddress, userData, onProfileUpdate }) {
    const [activeTab, setActiveTab] = useState('personal');
    const [profileData, setProfileData] = useState({
        fullName: userData?.fullName || '',
        email: userData?.email || '',
        phoneNumber: userData?.phoneNumber || '',
        dateOfBirth: userData?.dateOfBirth || '',
        nric: userData?.nric || '',
        homeAddress: userData?.homeAddress || '',
        emergencyContact: userData?.emergencyContact || '',
        bloodType: userData?.bloodType || '',
        profilePicture: userData?.profilePicture || null
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);

    // Fetch additional profile data on mount
    useEffect(() => {
        fetchProfileData();
    }, [walletAddress]);

    const fetchProfileData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${walletAddress.toLowerCase()}`);
            const data = await response.json();

            if (data.exists) {
                setProfileData(prev => ({
                    ...prev,
                    ...data.user
                }));
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleInputChange = (e) => {
        setProfileData({
            ...profileData,
            [e.target.name]: e.target.value
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];

        if (file) {
            // Validate file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                setMessage({ type: 'error', text: 'Please upload only PNG or JPG images' });
                return;
            }

            // Validate file size (max 2MB before compression)
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Image size must be less than 2MB' });
                return;
            }

            // Create image element for compression
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Resize image to max 200x200 (good for profile pictures)
                    const maxSize = 200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64 with compression (0.7 quality for JPEG)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    // Check final size
                    const sizeInBytes = compressedBase64.length;
                    const sizeInKB = sizeInBytes / 1024;

                    console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);
                    console.log(`Compressed base64 size: ${sizeInKB.toFixed(2)} KB`);

                    if (sizeInKB > 100) {
                        setMessage({ type: 'error', text: 'Image too large even after compression. Please use a smaller image.' });
                        return;
                    }

                    setPreviewImage(compressedBase64);
                    setProfileData(prev => ({
                        ...prev,
                        profilePicture: compressedBase64
                    }));
                    setMessage(null);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        if (isEditing && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);

        try {
            console.log('Saving profile data...');
            console.log('Profile picture size:', profileData.profilePicture ?
                (profileData.profilePicture.length / 1024 / 1024).toFixed(2) + ' MB' : 'None');

            const response = await fetch(`${API_BASE_URL}/api/user/${walletAddress.toLowerCase()}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (data.status === 'Success') {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setIsEditing(false);
                setPreviewImage(null);

                // Refresh user data in parent component
                if (onProfileUpdate) {
                    await onProfileUpdate();
                }
            } else {
                setMessage({ type: 'error', text: data.error || 'Update failed' });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: `Network error: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-page-container">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar-section">
                    <div
                        className="profile-avatar"
                        onClick={triggerFileInput}
                        style={{ cursor: isEditing ? 'pointer' : 'default', position: 'relative' }}
                    >
                        <img
                            src={previewImage || profileData.profilePicture || defaultProfilePic}
                            alt="Profile"
                            className="profile-avatar-image"
                        />
                        {isEditing && (
                            <div className="avatar-overlay">
                                <span>Upload</span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div>
                        <h2 className="profile-name">{profileData.fullName || 'User'}</h2>
                        {isEditing && (
                            <p className="upload-hint">Click avatar to upload photo</p>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="profile-tabs">
                    <button
                        className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('personal')}
                    >
                        Personal Details
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'appointments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('appointments')}
                    >
                        Appointment History
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="profile-content-scrollable">
                {message && (
                    <div className={`profile-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* Personal Details Tab */}
                {activeTab === 'personal' && (
                    <div className="profile-section">
                        <div className="profile-section-header">
                            <h3>Personal Details</h3>
                            {!isEditing ? (
                                <button
                                    className="edit-button"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="button-group">
                                    <button
                                        className="cancel-button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setPreviewImage(null);
                                            fetchProfileData();
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="save-button"
                                        onClick={handleSave}
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="profile-form">
                            <div className="form-row">
                                <div className="form-field">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={profileData.fullName}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="profile-input"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>NRIC / Passport Number</label>
                                    <input
                                        type="text"
                                        name="nric"
                                        value={profileData.nric}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="profile-input"
                                        placeholder="123456-78-9012"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="profile-input"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={profileData.phoneNumber}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="profile-input"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Date of Birth</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={profileData.dateOfBirth}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="profile-input"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Blood Type</label>
                                    <select
                                        name="bloodType"
                                        value={profileData.bloodType}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="profile-input"
                                    >
                                        <option value="">Select blood type</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-field full-width">
                                <label>Home Address</label>
                                <textarea
                                    name="homeAddress"
                                    value={profileData.homeAddress}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="profile-textarea"
                                    rows="3"
                                    placeholder="Home Adress"
                                />
                            </div>

                            <div className="form-field full-width">
                                <label>Emergency Contact</label>
                                <input
                                    type="text"
                                    name="emergencyContact"
                                    value={profileData.emergencyContact}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="profile-input"
                                    placeholder="Name - Relationship - Phone Number"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Appointment History Tab */}
                {activeTab === 'appointments' && (
                    <div className="profile-section">
                        <h3>Appointment History</h3>
                        <div className="empty-state">
                            <p>No appointment history available yet.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PatientProfile;