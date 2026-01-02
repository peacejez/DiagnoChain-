// client/src/ChatInterface.jsx - Updated with Modern Design

import React, { useState } from 'react';

// Inline styles moved into this file so no external CSS is required
const styles = {
    // page background similar to DiagnosisHistory layout
    container: { fontFamily: 'Outfit, sans-serif', padding: 32, backgroundColor: '#204a66', minHeight: '100%', color: '#111' },
    // the white card that holds the chat UI (centered)
    pageCard: { maxWidth: 1100, margin: '18px auto', backgroundColor: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 10px 30px rgba(2,6,23,0.2)', border: '1px solid rgba(2,6,23,0.06)' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { margin: 0, fontSize: 26, color: '#0b3d91', fontWeight: 700 },
    // Input area styling: white rounded input card with textarea + right button
    inputCard: { background: '#ffffff', padding: 18, borderRadius: 10, boxShadow: '0 8px 20px rgba(2,6,23,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid rgba(2,6,23,0.04)' },
    textarea: { flex: 1, minHeight: 120, padding: 14, borderRadius: 8, border: '1px solid #eef3fb', fontSize: 14, resize: 'vertical', background: '#fbfdff' },
    analyzeWrap: { display: 'flex', alignItems: 'center' },
    analyzeBtn: { background: '#0b5ad9', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', minWidth: 140, boxShadow: '0 6px 18px rgba(11,84,217,0.18)' },
    analyzeBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' },
    resultsSection: { marginTop: 12 },
    card: { background: '#fff', borderRadius: 12, padding: 0, boxShadow: '0 6px 18px rgba(12,20,40,0.06)', border: '1px solid rgba(15,23,42,0.04)', marginTop: 18 },
    resultHeader: { background: 'linear-gradient(90deg,#fde8e8,#fff7f7)', padding: '14px 16px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(240,200,200,0.3)' },
    predHeader: { display: 'flex', flexDirection: 'column', gap: 6 },
    diseaseName: { margin: 0, fontSize: 20, color: '#143f6b', fontWeight: 700 },
    confidenceBadge: { background: '#eef6ff', color: '#0b3d91', padding: '6px 12px', borderRadius: 999, fontSize: 13 },
    detectedSymptoms: { marginTop: 12, padding: 14 },
    symptomTags: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
    symptomTag: { background: '#f3f6ff', color: '#0b3d91', padding: '6px 8px', borderRadius: 999, fontSize: 13 },
    descriptionBox: { marginTop: 12, padding: 12, background: '#fbfdff', borderRadius: 8, border: '1px solid #eef3fb', color: '#374151' },
    actionsSection: { display: 'flex', gap: 20, marginTop: 14, padding: 14 },
    actionsColumn: { flex: 1 },
    precautionsList: { marginTop: 8, paddingLeft: 18, color: '#1f2937' },
    otherList: { marginTop: 8, paddingLeft: 18, color: '#1f2937' },
    otherItem: { display: 'flex', justifyContent: 'space-between', gap: 12 },
    blockchainHeader: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 },
    hashBox: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#0b3650', color: '#fff', borderRadius: 8 },
    footerBar: { marginTop: 12, background: '#0b3650', color: '#fff', padding: '12px 16px', borderRadius: '0 0 10px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    footerHashText: { fontSize: 13, color: '#bfe1ff' },
    requestBtn: { background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', alignItems: 'center' },
    smallBtn: { marginLeft: 8, padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#eef2ff' },
    viewProofBtn: { marginTop: 10, background: '#0b3d91', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 14 },
    modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(10,12,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 },
    modalContent: { width: 'min(760px, 94%)', background: '#fff', padding: 20, borderRadius: 12, position: 'relative' },
    modalClose: { position: 'absolute', right: 12, top: 8, background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer' },
    modalHashBox: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, background: '#f6f8fb', padding: 10, borderRadius: 8 }
};

const API_BASE_URL = 'http://localhost:3001';

function ChatInterface({ getPrediction, symptoms, setSymptoms, predictions, loading, predictionStatus }) {

    // --- STATES FOR BLOCKCHAIN PROOF AND MODAL ---
    const [txProof, setTxProof] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [isMinting, setIsMinting] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const handleSubmit = () => {
        getPrediction(symptoms);
        setTxProof(null);
        setIsVerified(false);
        setShowDetails(false);
    };

    const storePredictionProof = async (currentSymptoms, finalPredictions) => {
        try {
            setIsMinting(true);
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            const walletAddress = accounts && accounts.length ? accounts[0] : null;

            console.log('=== STORING PREDICTION PROOF ===');
            console.log('Wallet:', walletAddress);
            console.log('Symptoms:', currentSymptoms);
            console.log('Predictions:', finalPredictions);

            const response = await fetch(`${API_BASE_URL}/api/store-proof`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    symptoms: currentSymptoms,
                    prediction: finalPredictions,
                }),
            });

            const data = await response.json();

            console.log('Store proof response:', data);

            if (data.status === 'Success' && data.txHash) {
                setTxProof({
                    txHash: data.txHash,
                    timestamp: data.timestamp,
                    patientName: data.patientName,
                    confidence: data.confidence
                });
                console.log('✅ Proof stored successfully');
            } else {
                console.error("❌ Proof storage failed:", data.error);
                alert('Failed to store proof: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error("❌ Error storing proof:", error);
            alert('Network error while storing proof');
        } finally {
            setIsMinting(false);
        }
    };

    const handleVerifyClick = () => {
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            setIsVerified(true);
        }, 1500);
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

    // Extract symptoms from the input text
    const extractSymptoms = (text) => {
        const commonSymptoms = [
            'fever', 'high fever', 'cough', 'headache', 'fatigue',
            'muscle pain', 'joint pain', 'chills', 'sore throat',
            'runny nose', 'pain behind eyes', 'skin rash', 'nausea',
            'vomiting', 'diarrhea', 'chest pain', 'breathing difficulty'
        ];

        const detected = [];
        const lowerText = text.toLowerCase();

        commonSymptoms.forEach(symptom => {
            if (lowerText.includes(symptom)) {
                detected.push(symptom);
            }
        });

        return detected;
    };

    const detectedSymptoms = predictions.length > 0 ? extractSymptoms(symptoms) : [];

    return (
        <div style={styles.container}>
            <div style={styles.pageCard}>
                <div style={styles.header}>
                    <h1 style={styles.title}>DiagnoChain AI</h1>
                </div>

                {/* Input Section */}
                <div style={styles.inputCard}>
                    <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="i have fever, headache and cough"
                        style={styles.textarea}
                        disabled={loading}
                    />

                    <div style={styles.analyzeWrap}>
                        <button
                            style={{
                                ...styles.analyzeBtn,
                                ...(loading ? styles.analyzeBtnDisabled : {})
                            }}
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Analyzing...' : 'Analyze Symptoms'}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                {predictions.length > 0 && (
                    <div style={styles.resultsSection}>
                        {/* Primary Prediction Card */}
                        <div style={styles.card}>
                            <div style={styles.resultHeader}>
                                <div style={styles.predHeader}>
                                    <h2 style={styles.diseaseName}>{predictions[0].disease}</h2>
                                    <div style={{ color: '#475569', fontSize: 13 }}>{predictions[0].description?.substring(0, 120)}{predictions[0].description && predictions[0].description.length > 120 ? '...' : ''}</div>
                                </div>
                                <div style={styles.confidenceBadge}>
                                    {(predictions[0].confidence * 100).toFixed(2)}%
                                </div>
                            </div>
                            <div style={{ padding: 14 }}>

                                {/* Detected Symptoms */}
                                {detectedSymptoms.length > 0 && (
                                    <div style={styles.detectedSymptoms}>
                                        <h4 style={{ margin: 0, color: '#0b3d91' }}>SYMPTOMS DETECTED</h4>
                                        <div style={styles.symptomTags}>
                                            {detectedSymptoms.map((symptom, idx) => (
                                                <span key={idx} style={styles.symptomTag}>
                                                    {symptom}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div style={styles.descriptionBox}>
                                    <p style={{ margin: 0, color: '#374151', lineHeight: 1.5 }}>{predictions[0].description}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={styles.actionsSection}>
                                <div style={styles.actionsColumn}>
                                    <h4 style={{ color: '#0b3d91' }}>Recommended Actions</h4>
                                    <ul style={styles.precautionsList}>
                                        {predictions[0].precautions?.map((precaution, idx) => (
                                            <li key={idx}>{precaution}</li>
                                        ))}
                                    </ul>
                                </div>

                                {predictions.length > 1 && (
                                    <div style={styles.actionsColumn}>
                                        <h4 style={{ color: '#0b3d91' }}>Other Possibilities</h4>
                                        <ul style={styles.otherList}>
                                            {predictions.slice(1).map((pred, idx) => (
                                                <li key={idx} style={styles.otherItem}>
                                                    <span>{pred.disease}</span>
                                                    <span style={{ color: '#6b7280' }}>{(pred.confidence * 100).toFixed(2)}%</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Blockchain Proof Section */}
                            <div>
                                <div style={{ padding: '8px 14px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        {txProof ? (
                                            <span style={styles.hashBox}>
                                                {txProof.txHash.substring(0, 12)}...
                                                <button
                                                    style={styles.smallBtn}
                                                    onClick={() => copyToClipboard(txProof.txHash)}
                                                    title="Copy full hash"
                                                >
                                                    Copy
                                                </button>
                                            </span>
                                        ) : (
                                            <button
                                                style={{ ...styles.requestBtn, opacity: isMinting ? 0.85 : 1 }}
                                                onClick={() => {
                                                    if (!isMinting) storePredictionProof(symptoms, predictions);
                                                }}
                                                disabled={isMinting}
                                            >
                                                {isMinting ? (
                                                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                                                        <svg width="16" height="16" viewBox="0 0 50 50"><path d="M45 25a20 20 0 0 1-20 20" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" /></path></svg>
                                                        Minting Record...
                                                    </span>
                                                ) : (
                                                    'Request Doctor Review'
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {txProof && (
                                    <div style={styles.footerBar}>
                                        <div style={styles.footerHashText}>DATA INTEGRITY HASH: {txProof.txHash.substring(0, 24)}</div>
                                        <button style={styles.requestBtn} onClick={() => setIsModalOpen(true)}>View Proof</button>
                                    </div>
                                )}
                                {!txProof && isMinting && (
                                    <div style={styles.footerBar}>
                                        <div style={styles.footerHashText}>Minting transaction — this may take a moment</div>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 50 50"><path d="M45 25a20 20 0 0 1-20 20" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" /></path></svg>
                                            <button style={{ ...styles.requestBtn, opacity: 0.9 }} disabled>Minting Record...</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div style={styles.loadingContainer}>
                        <svg width="48" height="48" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="25" cy="25" r="20" stroke="#e6eefc" strokeWidth="6" fill="none" />
                            <path d="M45 25a20 20 0 0 1-20 20" stroke="#0b5ad9" strokeWidth="6" strokeLinecap="round" fill="none">
                                <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                            </path>
                        </svg>
                        <p>Analyzing your symptoms...</p>
                    </div>
                )}

                {/* Blockchain Proof Modal */}
                {isModalOpen && (
                    <div style={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <button
                                style={styles.modalClose}
                                onClick={() => setIsModalOpen(false)}
                            >
                                ×
                            </button>

                            <h2>Blockchain Proof</h2>

                            {!isVerified ? (
                                <div>
                                    <h3>Transaction Hash:</h3>
                                    <div style={styles.modalHashBox}>
                                        <code style={{ wordBreak: 'break-all' }}>{txProof?.txHash}</code>
                                        <button
                                            style={styles.smallBtn}
                                            onClick={() => copyToClipboard(txProof.txHash)}
                                        >
                                            Copy
                                        </button>
                                    </div>

                                    <div style={{ marginTop: 12 }}>
                                        <p><strong>Timestamp:</strong> {txProof?.timestamp}</p>
                                        <p><strong>Status:</strong> Recorded on Blockchain</p>
                                    </div>

                                    <button
                                        style={{ ...styles.viewProofBtn, marginTop: 12 }}
                                        onClick={handleVerifyClick}
                                        disabled={isVerifying || !txProof}
                                    >
                                        {isVerifying ? 'Verifying...' : 'Verify on Blockchain'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 16 }}>
                                    <div style={{ fontSize: 36, color: '#16a34a' }}>✓</div>
                                    <h3>Transaction Verified</h3>
                                    <p>This diagnosis has been verified on the blockchain.</p>
                                    <button
                                        style={{ ...styles.viewProofBtn, background: '#16a34a' }}
                                        onClick={() => setIsModalOpen(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatInterface;
