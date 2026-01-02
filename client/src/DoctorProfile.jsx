// client/src/DoctorProfile.jsx - Doctor Profile Management

import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001';

function DoctorProfile({ walletAddress, userData, onUpdateProfile }) {
    const [activeTab, setActiveTab] = useState('personal');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = React.useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        // Personal Info
        fullName: userData?.fullName || '',
        email: userData?.email || '',
        phoneNumber: userData?.phoneNumber || '',
        profilePicture: userData?.profilePicture || '',

        // Professional Credentials
        medicalLicenseNumber: userData?.medicalLicenseNumber || '',
        specialization: userData?.specialization || '',
        boardCertifications: userData?.boardCertifications || [],
        educationalHistory: userData?.educationalHistory || '',
        yearsOfExperience: userData?.yearsOfExperience || '',

        // Practice Information
        clinicName: userData?.clinicName || '',
        practiceAddress: userData?.practiceAddress || '',
        city: userData?.city || '',
        state: userData?.state || '',
        zipCode: userData?.zipCode || '',
        officeHours: userData?.officeHours || '',

        // Additional Details
        languages: userData?.languages || [],
        biography: userData?.biography || '',
        consultationFee: userData?.consultationFee || '',
    });

    // Statistics
    const [statistics, setStatistics] = useState({
        totalCasesReviewed: 0,
        casesAccepted: 0,
        casesRejected: 0,
        casesPendingReview: 0,
        totalAppointments: 0,
        averageResponseTime: '0',
    });

    useEffect(() => {
        fetchStatistics();
    }, [walletAddress]);

    const fetchStatistics = async () => {
        try {
            // Fetch cases statistics
            const casesRes = await fetch(`${API_BASE_URL}/api/cases`);
            const casesData = await casesRes.json();

            if (casesData.status === 'Success') {
                const doctorCases = casesData.cases.filter(c =>
                    c.reviewedByWallet?.toLowerCase() === walletAddress.toLowerCase()
                );

                setStatistics({
                    totalCasesReviewed: doctorCases.length,
                    casesAccepted: doctorCases.filter(c => c.verificationStatus === 'Answer Accepted').length,
                    casesRejected: doctorCases.filter(c => c.verificationStatus === 'Answer Rejected').length,
                    casesPendingReview: casesData.cases.filter(c => c.verificationStatus === 'Pending Verify').length,
                    totalAppointments: 0, // Will be updated when appointments are fetched
                    averageResponseTime: '2h 30m',
                });
            }
        } catch (err) {
            console.error('Error fetching statistics:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleArrayInput = (name, value) => {
        // Convert comma-separated string to array
        const array = value.split(',').map(item => item.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, [name]: array }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${walletAddress}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.status === 'Success') {
                alert('Profile updated successfully!');
                setIsEditing(false);
                if (onUpdateProfile) onUpdateProfile();
            } else {
                alert('Failed to update profile: ' + data.error);
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle File Upload via Click
    const handleAvatarClick = () => {
        if (isEditing && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500; // Resize to max 500px width
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Compress to JPEG with 0.7 quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(compressedDataUrl);
                };
            };
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Compress image before setting state
                const compressedImage = await compressImage(file);
                setFormData(prev => ({ ...prev, profilePicture: compressedImage }));
            } catch (error) {
                console.error("Error compressing image:", error);
                alert("Failed to process image. Please try another one.");
            }
        }
        // Reset input so the same file can be selected again if needed
        e.target.value = '';
    };

    const handleCancel = () => {
        // Reset form to original userData
        setFormData({
            fullName: userData?.fullName || '',
            email: userData?.email || '',
            phoneNumber: userData?.phoneNumber || '',
            profilePicture: userData?.profilePicture || '',
            medicalLicenseNumber: userData?.medicalLicenseNumber || '',
            specialization: userData?.specialization || '',
            boardCertifications: userData?.boardCertifications || [],
            educationalHistory: userData?.educationalHistory || '',
            yearsOfExperience: userData?.yearsOfExperience || '',
            clinicName: userData?.clinicName || '',
            practiceAddress: userData?.practiceAddress || '',
            city: userData?.city || '',
            state: userData?.state || '',
            zipCode: userData?.zipCode || '',
            officeHours: userData?.officeHours || '',
            languages: userData?.languages || [],
            biography: userData?.biography || '',
            consultationFee: userData?.consultationFee || '',
        });
        setIsEditing(false);
    };

    return (
        <div style={styles.container}>
            {/* Profile Header */}
            <div style={styles.profileHeader}>
                <div style={styles.profileInfo}>
                    <div style={styles.avatarContainer}>
                        <img
                            src={formData.profilePicture || 'https://via.placeholder.com/150'}
                            alt="Doctor"
                            style={{
                                ...styles.avatar,
                                cursor: isEditing ? 'pointer' : 'default',
                                opacity: isEditing ? 0.9 : 1
                            }}
                            onClick={handleAvatarClick}
                        />
                        {isEditing && (
                            <div style={styles.uploadOverlay} onClick={handleAvatarClick}>
                                📷
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <div style={styles.roleBadge}>Doctor</div>
                    </div>
                    <div style={styles.headerText}>
                        <h1 style={styles.doctorName}>Dr. {formData.fullName}</h1>
                        <p style={styles.specialization}>{formData.specialization || 'Medical Professional'}</p>
                        <p style={styles.walletAddress}>
                            Wallet: {walletAddress?.substring(0, 6)}...{walletAddress?.substring(38)}
                        </p>
                    </div>
                </div>
                <div style={styles.headerActions}>
                    {!isEditing ? (
                        <button style={styles.editButton} onClick={() => setIsEditing(true)}>
                            Edit Profile
                        </button>
                    ) : (
                        <div style={styles.actionButtons}>
                            <button style={styles.cancelButton} onClick={handleCancel}>
                                Cancel
                            </button>
                            <button
                                style={styles.saveButton}
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Statistics Cards */}
            <div style={styles.statsContainer}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{statistics.totalCasesReviewed}</div>
                    <div style={styles.statLabel}>Cases Reviewed</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{statistics.casesAccepted}</div>
                    <div style={styles.statLabel}>Approved</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{statistics.casesPendingReview}</div>
                    <div style={styles.statLabel}>Pending Review</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{statistics.averageResponseTime}</div>
                    <div style={styles.statLabel}>Avg Response</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    style={{ ...styles.tab, ...(activeTab === 'personal' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('personal')}
                >
                    Personal Details
                </button>
                <button
                    style={{ ...styles.tab, ...(activeTab === 'credentials' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('credentials')}
                >
                    Credentials & Licensing
                </button>
                <button
                    style={{ ...styles.tab, ...(activeTab === 'practice' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('practice')}
                >
                    Practice Information
                </button>
            </div>

            {/* Tab Content */}
            <div style={styles.tabContent}>
                {activeTab === 'personal' && (
                    <PersonalDetailsTab
                        formData={formData}
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                        handleArrayInput={handleArrayInput}
                    />
                )}

                {activeTab === 'credentials' && (
                    <CredentialsTab
                        formData={formData}
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                        handleArrayInput={handleArrayInput}
                    />
                )}

                {activeTab === 'practice' && (
                    <PracticeTab
                        formData={formData}
                        isEditing={isEditing}
                        handleInputChange={handleInputChange}
                    />
                )}
            </div>
        </div>
    );
}

// Personal Details Tab
function PersonalDetailsTab({ formData, isEditing, handleInputChange, handleArrayInput }) {
    return (
        <div style={styles.formContainer}>
            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name *</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Email *</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        style={styles.input}
                    />
                </div>
            </div>

            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Phone Number *</label>
                    <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Languages Spoken</label>
                    <input
                        type="text"
                        name="languages"
                        value={formData.languages?.join(', ') || ''}
                        onChange={(e) => handleArrayInput('languages', e.target.value)}
                        disabled={!isEditing}
                        placeholder="English, Malay, Chinese (comma-separated)"
                        style={styles.input}
                    />
                </div>
            </div>



            <div style={styles.formGroup}>
                <label style={styles.label}>Professional Biography</label>
                <textarea
                    name="biography"
                    value={formData.biography}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows="5"
                    placeholder="Brief professional background and expertise..."
                    style={{ ...styles.input, ...styles.textarea }}
                />
            </div>
        </div>
    );
}

// Credentials Tab
function CredentialsTab({ formData, isEditing, handleInputChange, handleArrayInput }) {
    return (
        <div style={styles.formContainer}>
            <div style={{ padding: '10px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '20px', color: '#4a5568', fontSize: '0.9rem' }}>
                ℹ️ <strong>Note:</strong> These credentials are verified during registration and cannot be edited.
            </div>

            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Medical License Number *</label>
                    <input
                        type="text"
                        name="medicalLicenseNumber"
                        value={formData.medicalLicenseNumber}
                        readOnly
                        disabled
                        placeholder="e.g., MD123456"
                        style={{ ...styles.input, cursor: 'not-allowed', background: '#f8f9fa' }}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Specialization(s) *</label>
                    <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        readOnly
                        disabled
                        placeholder="e.g., Cardiology, General Practice"
                        style={{ ...styles.input, cursor: 'not-allowed', background: '#f8f9fa' }}
                    />
                </div>
            </div>

            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Years of Experience</label>
                    <input
                        type="number"
                        name="yearsOfExperience"
                        value={formData.yearsOfExperience}
                        readOnly
                        disabled
                        placeholder="e.g., 10"
                        style={{ ...styles.input, cursor: 'not-allowed', background: '#f8f9fa' }}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Board Certifications</label>
                    <input
                        type="text"
                        name="boardCertifications"
                        value={formData.boardCertifications?.join(', ') || ''}
                        readOnly
                        disabled
                        placeholder="ABIM, ABFM (comma-separated)"
                        style={{ ...styles.input, cursor: 'not-allowed', background: '#f8f9fa' }}
                    />
                </div>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Educational History</label>
                <textarea
                    name="educationalHistory"
                    value={formData.educationalHistory}
                    readOnly
                    disabled
                    rows="4"
                    placeholder="M.D. - Harvard Medical School, 2010&#10;Residency - Johns Hopkins Hospital, 2014"
                    style={{ ...styles.input, ...styles.textarea, cursor: 'not-allowed', background: '#f8f9fa' }}
                />
            </div>
        </div>
    );
}

// Practice Tab
function PracticeTab({ formData, isEditing, handleInputChange }) {
    return (
        <div style={styles.formContainer}>
            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Clinic / Hospital Name *</label>
                    <input
                        type="text"
                        name="clinicName"
                        value={formData.clinicName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="e.g., KPJ Damansara Specialist Hospital"
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Consultation Fee (RM)</label>
                    <input
                        type="number"
                        name="consultationFee"
                        value={formData.consultationFee}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="e.g., 150"
                        style={styles.input}
                    />
                </div>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Practice Address *</label>
                <input
                    type="text"
                    name="practiceAddress"
                    value={formData.practiceAddress}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Street address"
                    style={styles.input}
                />
            </div>

            <div style={styles.formRow}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>City</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="e.g., Kuala Lumpur"
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>State</label>
                    <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="e.g., Selangor"
                        style={styles.input}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Zip Code</label>
                    <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="e.g., 50088"
                        style={styles.input}
                    />
                </div>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Office Hours / Availability</label>
                <textarea
                    name="officeHours"
                    value={formData.officeHours}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows="4"
                    placeholder="Mon-Fri: 9:00 AM - 5:00 PM&#10;Sat: 9:00 AM - 1:00 PM&#10;Sun: Closed"
                    style={{ ...styles.input, ...styles.textarea }}
                />
            </div>
        </div>
    );
}

// Styles
const styles = {
    container: {
        padding: '30px',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        overflowY: 'auto', // Allow scrolling within the component
    },
    profileHeader: {
        background: 'linear-gradient(135deg, #2c5282 0%, #3d6ba8 100%)',
        padding: '40px',
        borderRadius: '16px',
        color: 'white',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
    },
    profileInfo: {
        display: 'flex',
        gap: '25px',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '24px',
        color: 'white',
        pointerEvents: 'none',
        zIndex: 10,
    },
    avatar: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        border: '5px solid white',
        objectFit: 'cover',
    },
    roleBadge: {
        position: 'absolute',
        bottom: '-5px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#FF8C42',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    headerText: {},
    doctorName: {
        margin: '0 0 8px 0',
        fontSize: '32px',
        fontWeight: '700',
    },
    specialization: {
        margin: '0 0 8px 0',
        fontSize: '18px',
        opacity: '0.9',
    },
    walletAddress: {
        margin: 0,
        fontSize: '14px',
        opacity: '0.8',
        fontFamily: 'monospace',
    },
    headerActions: {},
    editButton: {
        padding: '12px 28px',
        background: 'white',
        color: '#667eea',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'transform 0.2s',
    },
    actionButtons: {
        display: 'flex',
        gap: '12px',
    },
    cancelButton: {
        padding: '12px 28px',
        background: 'rgba(255,255,255,0.2)',
        color: 'white',
        border: '2px solid white',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    saveButton: {
        padding: '12px 28px',
        background: '#48bb78',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    statsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
    },
    statCard: {
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    },
    statIcon: {
        fontSize: '32px',
        marginBottom: '10px',
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: '5px',
    },
    statLabel: {
        fontSize: '14px',
        color: '#718096',
    },
    tabs: {
        display: 'flex',
        gap: '8px',
        marginBottom: '25px',
        borderBottom: '2px solid #e2e8f0',
    },
    tab: {
        padding: '14px 24px',
        background: 'transparent',
        border: 'none',
        borderBottom: '3px solid transparent',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '600',
        color: '#718096',
        transition: 'all 0.3s',
    },
    activeTab: {
        color: '#667eea',
        borderBottom: '3px solid #667eea',
    },
    tabContent: {
        background: 'white',
        padding: '35px',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        // Ensure no nested scrolling limits
        height: 'auto',
        overflow: 'visible',
    },
    formContainer: {},
    formRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
    },
    formGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: '8px',
    },
    input: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        transition: 'border-color 0.3s',
        boxSizing: 'border-box',
    },
    textarea: {
        resize: 'vertical',
        fontFamily: 'inherit',
    },
};

export default DoctorProfile;