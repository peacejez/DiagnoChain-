// client/src/DoctorAppointments.jsx

import React, { useState, useEffect } from 'react';
import './Web3Login.css'; // Reuse existing styles

const API_BASE_URL = 'http://localhost:3001';

function DoctorAppointments({ walletAddress, userData }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all'); // all, pending, confirmed, completed, cancelled, rescheduled, rejected
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchDoctorAppointments();
    }, [walletAddress]);

    const fetchDoctorAppointments = async () => {
        try {
            console.log('Fetching appointments for doctor:', walletAddress);

            // Fetch all appointments where doctorId matches this doctor's wallet
            const response = await fetch(`${API_BASE_URL}/api/doctors/${walletAddress.toLowerCase()}/appointments`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Doctor appointments data:', data);

            if (data.status === 'Success') {
                setAppointments(data.appointments || []);
                setError(null);
            } else {
                setError(data.error || 'Failed to load appointments');
            }
        } catch (err) {
            console.error('Error fetching doctor appointments:', err);
            setError(`Failed to load appointments: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const updateAppointmentStatus = async (appointmentId, newStatus) => {
        try {
            console.log('=== UPDATING APPOINTMENT STATUS ===');
            console.log('Appointment ID:', appointmentId);
            console.log('New Status:', newStatus);

            const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Update failed:', errorData);
                alert(`Failed to update: ${errorData.error || 'Unknown error'}`);
                return;
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (data.status === 'Success') {
                console.log('✅ Appointment status updated successfully');
                // Refresh appointments
                await fetchDoctorAppointments();
                setShowDetailsModal(false);

                // Show success message
                alert(`Appointment status updated to ${newStatus} successfully!`);
            } else {
                alert(`Failed to update: ${data.error}`);
            }
        } catch (err) {
            console.error('❌ Error updating appointment:', err);
            alert(`Network error: ${err.message}`);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': '#FFC107',
            'confirmed': '#28A745',
            'completed': '#007BFF',
            'cancelled': '#DC3545',
            'rescheduled': '#17A2B8',
            'rejected': '#6C757D'
        };
        return colors[status.toLowerCase()] || '#6C757D';
    };

    // Filter appointments
    const filteredAppointments = appointments.filter(apt => {
        const matchesStatus = filterStatus === 'all' || apt.status.toLowerCase() === filterStatus;
        const matchesSearch = apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Sort by date (most recent first)
    const sortedAppointments = [...filteredAppointments].sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.timeSlot.localeCompare(b.timeSlot);
    });

    if (loading) {
        return (
            <div className="appointments-container">
                <div className="loading-state">Loading appointments...</div>
            </div>
        );
    }

    return (
        <div className="doctor-appointments-container">
            <div className="appointments-header">
                <div>
                    <h2>Manage Appointments</h2>
                    <p className="subtitle">View and manage patient appointments</p>
                </div>
                <div className="header-actions">
                    <span className="view-toggle">
                        <button className="toggle-btn active">Patient</button>
                        <button className="toggle-btn">Doctor</button>
                    </span>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="appointments-controls">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by patient name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="status-filters">
                    <button
                        className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        All ({appointments.length})
                    </button>
                    <button
                        className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('pending')}
                    >
                        Pending ({appointments.filter(a => a.status.toLowerCase() === 'pending').length})
                    </button>
                    <button
                        className={`filter-btn ${filterStatus === 'confirmed' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('confirmed')}
                    >
                        Confirmed ({appointments.filter(a => a.status.toLowerCase() === 'confirmed').length})
                    </button>
                    <button
                        className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('completed')}
                    >
                        Completed ({appointments.filter(a => a.status.toLowerCase() === 'completed').length})
                    </button>
                </div>
            </div>

            {error && <div className="error-state">{error}</div>}

            {/* Appointments Table */}
            {sortedAppointments.length === 0 ? (
                <div className="empty-appointments">
                    <p>No appointments found</p>
                    {filterStatus !== 'all' && (
                        <button className="web3-button" onClick={() => setFilterStatus('all')}>
                            Show All Appointments
                        </button>
                    )}
                </div>
            ) : (
                <div className="appointments-table-container">
                    <table className="appointments-table">
                        <thead>
                            <tr>
                                <th>CASE ID</th>
                                <th>ADMITTED</th>
                                <th>PATIENT'S NAME</th>
                                <th>STATUS</th>
                                <th>DESCRIPTION</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAppointments.map((appointment, index) => (
                                <tr key={appointment.id}>
                                    <td>#{String(index + 1).padStart(4, '0')}</td>
                                    <td>{formatDate(appointment.date)}</td>
                                    <td>
                                        <strong>{appointment.patientName}</strong>
                                        <div className="appointment-time">
                                            {formatTime(appointment.timeSlot)}
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={{
                                                backgroundColor: getStatusColor(appointment.status),
                                                color: 'white',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {appointment.status}
                                        </span>
                                    </td>
                                    <td className="description-cell">
                                        {appointment.description || 'General consultation'}
                                    </td>
                                    <td>
                                        <button
                                            className="action-btn view-btn"
                                            onClick={() => {
                                                setSelectedAppointment(appointment);
                                                setShowDetailsModal(true);
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

            {/* Appointment Details Modal */}
            {showDetailsModal && selectedAppointment && (
                <AppointmentDetailsModal
                    appointment={selectedAppointment}
                    onClose={() => setShowDetailsModal(false)}
                    onUpdateStatus={updateAppointmentStatus}
                />
            )}
        </div>
    );
}

// Appointment Details Modal Component
function AppointmentDetailsModal({ appointment, onClose, onUpdateStatus }) {
    const [notes, setNotes] = useState('');

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes} ${ampm}`;
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content appointment-details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Appointment Details</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="appointment-details-content">
                    <div className="detail-section">
                        <h3>Patient Information</h3>
                        <div className="detail-row">
                            <span className="detail-label">Patient Name:</span>
                            <span className="detail-value">{appointment.patientName}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Wallet Address:</span>
                            <span className="detail-value wallet-address">
                                {appointment.walletAddress.substring(0, 6)}...{appointment.walletAddress.substring(38)}
                            </span>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3>Appointment Details</h3>
                        <div className="detail-row">
                            <span className="detail-label">Date:</span>
                            <span className="detail-value">{formatDate(appointment.date)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Time:</span>
                            <span className="detail-value">{formatTime(appointment.timeSlot)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">
                                <span className="status-badge" style={{
                                    backgroundColor: appointment.status === 'Pending' ? '#FFC107' :
                                        appointment.status === 'Confirmed' ? '#28A745' :
                                            appointment.status === 'Completed' ? '#007BFF' : '#DC3545'
                                }}>
                                    {appointment.status}
                                </span>
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Created:</span>
                            <span className="detail-value">
                                {new Date(appointment.createdAt).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3>Description</h3>
                        <p className="appointment-description">
                            {appointment.description || 'No description provided'}
                        </p>
                    </div>

                    <div className="detail-section">
                        <h3>Doctor Notes (Optional)</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes about this appointment..."
                            rows="4"
                            className="form-input"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="appointment-actions">
                        <h3>Update Status</h3>
                        <div className="action-buttons-grid">
                            {appointment.status === 'Pending' && (
                                <>
                                    <button
                                        className="action-btn confirm-btn"
                                        onClick={() => onUpdateStatus(appointment.id, 'Confirmed')}
                                    >
                                        ✓ Confirm
                                    </button>
                                    <button
                                        className="action-btn reject-btn"
                                        onClick={() => onUpdateStatus(appointment.id, 'Rejected')}
                                    >
                                        ✗ Reject
                                    </button>
                                    <button
                                        className="action-btn reschedule-btn"
                                        onClick={() => onUpdateStatus(appointment.id, 'Rescheduled')}
                                    >
                                        ↻ Reschedule
                                    </button>
                                </>
                            )}

                            {appointment.status === 'Confirmed' && (
                                <>
                                    <button
                                        className="action-btn complete-btn"
                                        onClick={() => onUpdateStatus(appointment.id, 'Completed')}
                                    >
                                        ✓ Mark Complete
                                    </button>
                                    <button
                                        className="action-btn cancel-btn"
                                        onClick={() => onUpdateStatus(appointment.id, 'Cancelled')}
                                    >
                                        ✗ Cancel
                                    </button>
                                </>
                            )}

                            {(appointment.status === 'Completed' || appointment.status === 'Cancelled') && (
                                <div className="status-final-message">
                                    This appointment has been {appointment.status.toLowerCase()}.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DoctorAppointments;