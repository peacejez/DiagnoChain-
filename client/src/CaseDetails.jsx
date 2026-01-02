// client/src/CaseDetails.jsx - Doctor Case Verification System

import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001';

function CaseDetails({ walletAddress, userData }) {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCase, setSelectedCase] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('Pending Verify');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCases();
    }, []);

    const fetchCases = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/cases`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'Success') {
                setCases(data.cases || []);
                setError(null);
            } else {
                setError(data.error || 'Failed to load cases');
            }
        } catch (err) {
            console.error('Error fetching cases:', err);
            setError(`Failed to load cases: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const updateCaseStatus = async (caseId, newStatus, doctorNotes = '') => {
        try {
            console.log(`Updating case ${caseId} to ${newStatus}`);

            const response = await fetch(`${API_BASE_URL}/api/cases/${caseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    doctorWallet: walletAddress,
                    doctorName: userData?.fullName || 'Doctor',
                    doctorNotes: doctorNotes,
                    reviewedAt: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (data.status === 'Success') {
                console.log('✅ Case status updated');
                await fetchCases();
                setShowModal(false);
                alert(`Case status updated to: ${newStatus}`);
            } else {
                alert(`Failed to update: ${data.error}`);
            }
        } catch (err) {
            console.error('Error updating case:', err);
            alert('Failed to update case status');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending Verify': '#FFC107',
            'Answer Accepted': '#28A745',
            'Answer Rejected': '#DC3545',
            'Need Further Checking': '#17A2B8'
        };
        return colors[status] || '#6C757D';
    };

    const filteredCases = cases.filter(c => {
        const matchesStatus = filterStatus === 'All' || c.verificationStatus === filterStatus;
        const matchesSearch =
            c.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.patientWallet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.aiDiagnosis?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Sort by date (newest first)
    const sortedCases = [...filteredCases].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (loading) {
        return <div style={styles.loading}>Loading cases...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>Case Details - AI Verification</h2>
                    <p style={styles.subtitle}>Review and verify AI-generated diagnoses</p>
                </div>
            </div>

            {/* Controls */}
            <div style={styles.controls}>
                <input
                    type="text"
                    placeholder="Search by patient name, wallet, or diagnosis..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />

                <div style={styles.filterButtons}>
                    {['All', 'Pending Verify', 'Answer Accepted', 'Answer Rejected', 'Need Further Checking'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                ...styles.filterBtn,
                                ...(filterStatus === status ? styles.filterBtnActive : {})
                            }}
                        >
                            {status} ({cases.filter(c => status === 'All' || c.verificationStatus === status).length})
                        </button>
                    ))}
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {/* Cases List */}
            {sortedCases.length === 0 ? (
                <div style={styles.emptyState}>
                    <p>No cases found</p>
                    {filterStatus !== 'All' && (
                        <button style={styles.showAllBtn} onClick={() => setFilterStatus('All')}>
                            Show All Cases
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead style={styles.thead}>
                            <tr>
                                <th style={styles.th}>Case ID</th>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Patient Name</th>
                                <th style={styles.th}>Patient Wallet</th>
                                <th style={styles.th}>Patient Input</th>
                                <th style={styles.th}>AI Output</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCases.map((caseItem, index) => (
                                <tr key={caseItem.id} style={styles.tr}>
                                    <td style={styles.td}>#{String(index + 1).padStart(4, '0')}</td>
                                    <td style={styles.td}>{formatDate(caseItem.createdAt)}</td>
                                    <td style={styles.td}>
                                        <strong>{caseItem.patientName || 'Unknown'}</strong>
                                    </td>
                                    <td style={styles.td}>
                                        <code style={styles.walletCode}>
                                            {caseItem.patientWallet?.substring(0, 6)}...
                                            {caseItem.patientWallet?.substring(38)}
                                        </code>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.textEllipsis}>
                                            {caseItem.symptoms?.substring(0, 40)}...
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <strong>{caseItem.aiDiagnosis}</strong>
                                        <div style={styles.confidence}>
                                            {(caseItem.confidence * 100).toFixed(2)}% Confidence
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <span
                                            style={{
                                                ...styles.statusBadge,
                                                backgroundColor: getStatusColor(caseItem.verificationStatus)
                                            }}
                                        >
                                            {caseItem.verificationStatus}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <button
                                            style={styles.viewBtn}
                                            onClick={() => {
                                                setSelectedCase(caseItem);
                                                setShowModal(true);
                                            }}
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Case Details Modal */}
            {showModal && selectedCase && (
                <CaseDetailsModal
                    caseData={selectedCase}
                    onClose={() => setShowModal(false)}
                    onUpdateStatus={updateCaseStatus}
                    getStatusColor={getStatusColor}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
}

// Case Details Modal Component
function CaseDetailsModal({ caseData, onClose, onUpdateStatus, getStatusColor, formatDate }) {
    const [doctorNotes, setDoctorNotes] = useState('');
    const [selectedAction, setSelectedAction] = useState('');

    const handleSubmit = () => {
        if (!selectedAction) {
            alert('Please select an action');
            return;
        }
        onUpdateStatus(caseData.id, selectedAction, doctorNotes);
    };

    return (
        <div style={styles.modalBackdrop} onClick={onClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Case Details Review</h2>
                    <button style={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div style={styles.modalBody}>
                    {/* Patient Information */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>👤 Patient Information</h3>
                        <div style={styles.detailRow}>
                            <span style={styles.label}>Patient Name:</span>
                            <span style={styles.value}>{caseData.patientName || 'Unknown'}</span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.label}>Wallet Address:</span>
                            <span style={{ ...styles.value, ...styles.walletCode }}>
                                {caseData.patientWallet}
                            </span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.label}>Submitted:</span>
                            <span style={styles.value}>{formatDate(caseData.createdAt)}</span>
                        </div>
                    </div>

                    {/* Symptoms Input */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>📝 Patient's Input</h3>
                        <div style={styles.symptomsBox}>
                            {caseData.symptoms}
                        </div>
                    </div>

                    {/* AI Diagnosis */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>🤖 AI-Generated Diagnosis</h3>
                        <div style={styles.diagnosisCard}>
                            <div style={styles.diagnosisHeader}>
                                <h4 style={styles.diagnosisName}>{caseData.aiDiagnosis}</h4>
                                <span style={styles.confidenceBadge}>
                                    Confidence: {(caseData.confidence * 100).toFixed(2)}%
                                </span>
                            </div>

                            {caseData.description && (
                                <p style={styles.description}>{caseData.description}</p>
                            )}

                            {caseData.precautions && caseData.precautions.length > 0 && (
                                <div style={styles.precautions}>
                                    <strong>Recommended Actions:</strong>
                                    <ul style={styles.precautionsList}>
                                        {caseData.precautions.map((precaution, idx) => (
                                            <li key={idx}>{precaution}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {caseData.otherPossibilities && caseData.otherPossibilities.length > 0 && (
                                <div style={styles.otherPossibilities}>
                                    <strong>Other Possibilities:</strong>
                                    <ul style={styles.possibilitiesList}>
                                        {caseData.otherPossibilities.map((possibility, idx) => (
                                            <li key={idx}>
                                                {possibility.disease} ({possibility.confidence}%)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Current Status */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>📊 Current Status</h3>
                        <div style={styles.detailRow}>
                            <span style={styles.label}>Verification Status:</span>
                            <span
                                style={{
                                    ...styles.statusBadge,
                                    backgroundColor: getStatusColor(caseData.verificationStatus)
                                }}
                            >
                                {caseData.verificationStatus}
                            </span>
                        </div>
                        {caseData.reviewedBy && (
                            <>
                                <div style={styles.detailRow}>
                                    <span style={styles.label}>Reviewed By:</span>
                                    <span style={styles.value}>{caseData.reviewedBy}</span>
                                </div>
                                <div style={styles.detailRow}>
                                    <span style={styles.label}>Reviewed At:</span>
                                    <span style={styles.value}>{formatDate(caseData.reviewedAt)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Blockchain Info */}
                    {caseData.txHash && (
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>🔒 Blockchain Proof</h3>
                            <div style={styles.blockchainBox}>
                                <span style={styles.label}>Transaction Hash:</span>
                                <code style={styles.txHash}>{caseData.txHash}</code>
                            </div>
                        </div>
                    )}

                    {/* Doctor's Notes */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>📋 Doctor's Notes</h3>
                        <textarea
                            value={doctorNotes}
                            onChange={(e) => setDoctorNotes(e.target.value)}
                            placeholder="Add your professional assessment and notes..."
                            style={styles.notesTextarea}
                            rows="4"
                        />
                    </div>

                    {/* Action Buttons */}
                    {caseData.verificationStatus === 'Pending Verify' && (
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>✅ Review Actions</h3>
                            <div style={styles.actionButtons}>
                                <button
                                    style={{
                                        ...styles.actionBtn,
                                        ...styles.acceptBtn,
                                        ...(selectedAction === 'Answer Accepted' ? styles.actionBtnSelected : {})
                                    }}
                                    onClick={() => setSelectedAction('Answer Accepted')}
                                >
                                    ✓ Accept AI Diagnosis
                                </button>
                                <button
                                    style={{
                                        ...styles.actionBtn,
                                        ...styles.rejectBtn,
                                        ...(selectedAction === 'Answer Rejected' ? styles.actionBtnSelected : {})
                                    }}
                                    onClick={() => setSelectedAction('Answer Rejected')}
                                >
                                    ✗ Reject AI Diagnosis
                                </button>
                                <button
                                    style={{
                                        ...styles.actionBtn,
                                        ...styles.furtherBtn,
                                        ...(selectedAction === 'Need Further Checking' ? styles.actionBtnSelected : {})
                                    }}
                                    onClick={() => setSelectedAction('Need Further Checking')}
                                >
                                    🔍 Needs Further Review
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.modalFooter}>
                    <button style={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                    {caseData.verificationStatus === 'Pending Verify' && (
                        <button
                            style={styles.submitBtn}
                            onClick={handleSubmit}
                            disabled={!selectedAction}
                        >
                            Submit Review
                        </button>
                    )}
                </div>
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
    header: {
        marginBottom: '30px',
        padding: '25px',
        background: 'linear-gradient(135deg, #2c5282 0%, #3d6ba8 100%)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    },
    title: {
        color: 'white',
        fontSize: '28px',
        margin: '0',
        fontWeight: '700',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.9)',
        margin: '5px 0 0 0',
        fontSize: '15px',
    },
    controls: {
        display: 'flex',
        gap: '15px',
        marginBottom: '25px',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    searchInput: {
        flex: '1',
        minWidth: '300px',
        padding: '12px 20px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        background: 'white',
    },
    filterButtons: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
    },
    filterBtn: {
        padding: '10px 20px',
        border: '2px solid #e2e8f0',
        background: 'white',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'all 0.3s ease',
        color: '#4a5568',
    },
    filterBtnActive: {
        background: 'linear-gradient(135deg, #2c5282 0%, #3d6ba8 100%)',
        color: 'white',
        borderColor: '#000000ff',
    },
    loading: {
        textAlign: 'center',
        padding: '60px',
        fontSize: '18px',
        color: '#666',
    },
    error: {
        background: '#fed7d7',
        color: '#742a2a',
        padding: '15px 20px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '2px solid #fc8181',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    },
    showAllBtn: {
        padding: '10px 24px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        marginTop: '15px',
    },
    tableContainer: {
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    thead: {
        background: 'linear-gradient(135deg, #2c5282 0%, #3d6ba8 100%)',
        color: 'white',
    },
    th: {
        padding: '18px 20px',
        textAlign: 'left',
        fontWeight: '700',
        fontSize: '12px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        borderBottom: '3px solid #5568d3',
    },
    tr: {
        borderBottom: '1px solid #e2e8f0',
        transition: 'background 0.2s',
        cursor: 'pointer',
    },
    td: {
        padding: '18px 20px',
        fontSize: '14px',
        color: '#2d3748',
    },
    walletCode: {
        fontFamily: 'Courier New, monospace',
        background: '#f7fafc',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
    },
    textEllipsis: {
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    confidence: {
        fontSize: '12px',
        color: '#718096',
        marginTop: '4px',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        color: 'white',
    },
    viewBtn: {
        padding: '8px 16px',
        background: '#4299e1',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'all 0.3s',
    },
    modalBackdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        backdropFilter: 'blur(4px)',
    },
    modalContent: {
        background: 'white',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '25px 35px',
        borderBottom: '2px solid #e2e8f0',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px 20px 0 0',
    },
    modalTitle: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: 'white',
    },
    closeBtn: {
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        color: 'white',
        fontSize: '32px',
        cursor: 'pointer',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
    },
    modalBody: {
        padding: '35px',
    },
    section: {
        marginBottom: '30px',
        paddingBottom: '25px',
        borderBottom: '2px solid #f7fafc',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    detailRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0',
        alignItems: 'center',
        borderBottom: '1px solid #f7fafc',
    },
    label: {
        fontWeight: '600',
        color: '#4a5568',
        fontSize: '14px',
    },
    value: {
        color: '#2d3748',
        fontSize: '14px',
        textAlign: 'right',
    },
    symptomsBox: {
        background: '#f7fafc',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        lineHeight: '1.6',
        color: '#2d3748',
    },
    diagnosisCard: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '25px',
        borderRadius: '12px',
        color: 'white',
    },
    diagnosisHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px',
    },
    diagnosisName: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
    },
    confidenceBadge: {
        background: 'rgba(255,255,255,0.25)',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '600',
    },
    description: {
        fontSize: '15px',
        lineHeight: '1.6',
        marginBottom: '15px',
        opacity: '0.95',
        fontStyle: 'italic',
    },
    precautions: {
        background: 'rgba(255,255,255,0.15)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
    },
    precautionsList: {
        marginTop: '10px',
        paddingLeft: '20px',
    },
    otherPossibilities: {
        background: 'rgba(255,255,255,0.15)',
        padding: '15px',
        borderRadius: '8px',
    },
    possibilitiesList: {
        marginTop: '10px',
        paddingLeft: '20px',
    },
    blockchainBox: {
        background: '#f7fafc',
        padding: '15px',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
    },
    txHash: {
        display: 'block',
        marginTop: '8px',
        fontSize: '12px',
        wordBreak: 'break-all',
        color: '#2d3748',
    },
    notesTextarea: {
        width: '100%',
        padding: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical',
    },
    actionButtons: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
    },
    actionBtn: {
        padding: '14px 20px',
        border: '2px solid transparent',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
        textAlign: 'center',
    },
    acceptBtn: {
        background: '#48bb78',
        color: 'white',
    },
    rejectBtn: {
        background: '#f56565',
        color: 'white',
    },
    furtherBtn: {
        background: '#4299e1',
        color: 'white',
    },
    actionBtnSelected: {
        borderColor: '#2d3748',
        transform: 'scale(1.05)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        padding: '25px 35px',
        borderTop: '2px solid #e2e8f0',
        background: '#f7fafc',
        borderRadius: '0 0 20px 20px',
    },
    cancelBtn: {
        padding: '12px 28px',
        background: 'white',
        color: '#4a5568',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
    submitBtn: {
        padding: '12px 28px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
};

export default CaseDetails;