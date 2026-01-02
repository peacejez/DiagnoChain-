// Updated DiagnosisHistory Component for Patient Portal
// Shows doctor verification status aligned with CaseDetails

import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001';

function DiagnosisHistory({ walletAddress, onMakeAppointment }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [walletAddress]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/history/${walletAddress.toLowerCase()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'Success') {
                setHistory(data.history || []);
                setError(null);
            } else {
                setError(data.error || 'Failed to load history');
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            setError(`Failed to load history: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (textToCopy) => {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                alert("Transaction Hash copied to clipboard!");
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending Verify': '#FFC107',
            'Answer Accepted': '#28A745',
            'Answer Rejected': '#DC3545',
            'Need Further Checking': '#17A2B8',
            'Proof Recorded': '#6C757D'
        };
        return colors[status] || '#6C757D';
    };

    const getStatusDisplay = (record) => {
        // Show verification status if available, otherwise show proof status
        return record.verificationStatus || record.status || 'Pending';
    };

    const getDoctorDisplay = (record) => {
        // Show reviewing doctor if available, otherwise show assignment status
        if (record.reviewedBy) {
            return record.reviewedBy;
        } else if (record.verificationStatus === 'Pending Verify') {
            return 'Awaiting Doctor Review';
        } else {
            return 'Awaiting Assignment';
        }
    };

    if (loading) {
        return <div style={styles.loading}>Loading diagnosis history...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Diagnosis History</h2>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {history.length === 0 ? (
                <div style={styles.emptyState}>
                    <p>No diagnosis history found</p>
                </div>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead style={styles.thead}>
                            <tr>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Symptoms</th>
                                <th style={styles.th}>Prediction</th>
                                <th style={styles.th}>Verification Status</th>
                                <th style={styles.th}>Doctor</th>
                                <th style={styles.th}>Blockchain Proof</th>
                                <th style={styles.th}>NEXT STEPS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((record) => (
                                <tr key={record.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        {formatDate(record.date)}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.symptomsCell}>
                                            {record.symptoms?.substring(0, 40)}
                                            {record.symptoms?.length > 40 ? '...' : ''}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <strong>{record.prediction}</strong>
                                        {record.confidence && (
                                            <div style={styles.confidence}>
                                                {(record.confidence * 100).toFixed(2)}% confidence
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <span
                                            style={{
                                                ...styles.statusBadge,
                                                backgroundColor: getStatusColor(getStatusDisplay(record))
                                            }}
                                        >
                                            {getStatusDisplay(record)}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        {getDoctorDisplay(record)}
                                    </td>
                                    <td style={styles.td}>
                                        {record.txHash ? (
                                            <button
                                                style={styles.viewProofBtn}
                                                onClick={() => {
                                                    setSelectedRecord(record);
                                                    setShowModal(true);
                                                }}
                                            >
                                                View Proof
                                            </button>
                                        ) : (
                                            <span style={styles.noProof}>No Proof</span>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <button
                                            style={styles.makeAppointmentBtn}
                                            onClick={onMakeAppointment}
                                        >
                                            Make Appointment
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && selectedRecord && (
                <DiagnosisDetailModal
                    record={selectedRecord}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedRecord(null);
                    }}
                    formatDate={formatDate}
                    getStatusColor={getStatusColor}
                    getStatusDisplay={getStatusDisplay}
                />
            )}
        </div>
    );
}

function DiagnosisDetailModal({ record, onClose, formatDate, getStatusColor, getStatusDisplay }) {
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => alert('Copied to clipboard!'))
            .catch(err => console.error('Failed to copy:', err));
    };

    return (
        <div style={styles.modalBackdrop} onClick={onClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>Diagnosis Details</h2>
                    <button style={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div style={styles.modalBody}>
                    <div style={styles.section}>
                        <div style={styles.detailRow}>
                            <span style={styles.label}>Date:</span>
                            <span style={styles.value}>{formatDate(record.date)}</span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.label}>Status:</span>
                            <span
                                style={{
                                    ...styles.statusBadge,
                                    backgroundColor: getStatusColor(getStatusDisplay(record))
                                }}
                            >
                                {getStatusDisplay(record)}
                            </span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.label}>Reviewing Doctor:</span>
                            <span style={styles.value}>{record.reviewedBy || 'Not assigned'}</span>
                        </div>
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Symptoms</h3>
                        <div style={styles.symptomsBox}>
                            {record.symptoms}
                        </div>
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>AI Diagnosis</h3>
                        <div style={styles.diagnosisCard}>
                            <div style={styles.diagnosisHeader}>
                                <h4 style={styles.diagnosisName}>{record.prediction}</h4>
                                {record.confidence && (
                                    <span style={styles.confidenceBadge}>
                                        {(record.confidence * 100).toFixed(1)}% Confidence
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Blockchain Proof */}
                    {record.txHash && (
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Blockchain Proof</h3>
                            <div style={styles.blockchainBox}>
                                <div style={styles.txHashRow}>
                                    <code style={styles.txHash}>{record.txHash}</code>
                                    <button
                                        style={styles.copyBtn}
                                        onClick={() => window.open(`https://sepolia.etherscan.io/tx/${record.txHash}`, '_blank')}
                                    >
                                        View on Etherscan
                                    </button>
                                </div>
                                <p style={styles.blockchainNote}>
                                    This diagnosis has been securely recorded on the blockchain.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.modalFooter}>
                    <button style={styles.closeButton} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Styles
const styles = {
    container: {
        padding: '20px',
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        minHeight: '500px',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        marginBottom: '25px',
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#2d3748',
        margin: 0,
    },
    loading: {
        textAlign: 'center',
        padding: '60px',
        fontSize: '16px',
        color: '#718096',
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
        padding: '22px 24px',
        textAlign: 'left',
        fontWeight: '700',
        fontSize: '16px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
    },
    tr: {
        borderBottom: '1px solid #e2e8f0',
        transition: 'background 0.2s',
    },
    td: {
        padding: '22px 24px',
        fontSize: '16px',
        color: '#2d3748',
    },
    symptomsCell: {
        maxWidth: '300px',
    },
    confidence: {
        fontSize: '12px',
        color: '#718096',
        marginTop: '4px',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '8px 16px',
        borderRadius: '24px',
        fontSize: '14px',
        fontWeight: '700',
        color: 'white',
    },
    viewProofBtn: {
        padding: '10px 20px',
        background: '#4299e1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '600',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    noProof: {
        color: '#a0aec0',
        fontSize: '13px',
        fontStyle: 'italic',
    },
    makeAppointmentBtn: {
        background: '#2563EB',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'background 0.2s',
        whiteSpace: 'nowrap'
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
    },
    modalContent: {
        background: 'white',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '800px',
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
    },
    symptomsBox: {
        background: '#f7fafc',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        lineHeight: '1.6',
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
    notesBox: {
        background: '#fff5e6',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid #ffc107',
        lineHeight: '1.6',
        color: '#2d3748',
    },
    blockchainBox: {
        background: '#f7fafc',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
    },
    txHashRow: {
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        marginBottom: '15px',
    },
    txHash: {
        flex: 1,
        fontSize: '12px',
        wordBreak: 'break-all',
        background: 'white',
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
    },
    copyBtn: {
        padding: '10px 16px',
        background: '#4299e1',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    blockchainNote: {
        fontSize: '13px',
        color: '#718096',
        margin: 0,
        fontStyle: 'italic',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '25px 35px',
        borderTop: '2px solid #e2e8f0',
        background: '#f7fafc',
        borderRadius: '0 0 20px 20px',
    },
    closeButton: {
        padding: '12px 28px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default DiagnosisHistory;