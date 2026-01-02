// client/src/PatientAppointments.jsx

import React, { useState, useEffect } from 'react';
import './Web3Login.css';

const API_BASE_URL = 'http://localhost:3001';

function PatientAppointments({ walletAddress, userData, initialOpen = false, onAppointmentCreated }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(initialOpen);
    const [filterStatus, setFilterStatus] = useState('all');

    // Filter Logic
    const filteredAppointments = appointments.filter(app => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'upcoming') {
            const appDate = new Date(`${app.date}T${app.timeSlot}`);
            const deadStatuses = ['cancelled', 'rejected', 'rescheduled', 'completed'];
            return appDate >= new Date() && !deadStatuses.includes(app.status.toLowerCase());
        }
        if (filterStatus === 'pending') {
            return ['pending', 'rescheduled'].includes(app.status.toLowerCase());
        }
        return app.status.toLowerCase() === filterStatus.toLowerCase();
    });

    useEffect(() => {
        fetchAppointments();
    }, [walletAddress]);

    const fetchAppointments = async () => {
        try {
            console.log('Fetching appointments for:', walletAddress);

            const response = await fetch(`${API_BASE_URL}/api/appointments/${walletAddress.toLowerCase()}`);

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Appointments data:', data);

            if (data.status === 'Success') {
                setAppointments(data.appointments || []);
                setError(null);
            } else {
                setError(data.error || 'Failed to load appointments');
            }
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError(`Failed to load appointments: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return '#28a745';
            case 'pending': return '#ffc107';
            case 'completed': return '#007bff';
            case 'cancelled': return '#dc3545';
            case 'rejected': return '#dc3545';
            default: return '#6c757d';
        }
    };

    return (
        <div className="appointments-container">
            <div className="appointments-header">
                <h2>My Appointments</h2>
                <button
                    className="create-appointment-btn"
                    onClick={() => setShowModal(true)}
                >
                    + Create Appointment
                </button>
            </div>

            {/* Filtering Tabs */}
            <div className="filter-tabs">
                {['all', 'upcoming', 'pending', 'completed', 'rejected'].map(status => (
                    <div
                        key={status}
                        className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
                        onClick={() => setFilterStatus(status)}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                ))}
            </div>

            {loading && <div className="loading-state">Loading appointments...</div>}

            {error && <div className="error-state">{error}</div>}

            {
                !loading && !error && filteredAppointments.length === 0 && (
                    <div className="empty-appointments">
                        <p>No {filterStatus === 'all' ? '' : filterStatus} appointments found</p>
                        {filterStatus === 'all' && (
                            <button
                                className="web3-button"
                                onClick={() => setShowModal(true)}
                            >
                                Schedule Your First Appointment
                            </button>
                        )}
                    </div>
                )
            }

            {
                !loading && !error && filteredAppointments.length > 0 && (
                    <div className="appointments-list">
                        {filteredAppointments.map((appointment) => {
                            const statusClass = `status-${appointment.status.toLowerCase()}`;
                            return (
                                <div key={appointment.id} className="appointment-card-new">
                                    {/* Left: Date Box */}
                                    <div className="date-box">
                                        <span className="date-day">{new Date(appointment.date).getDate()}</span>
                                        <span className="date-month">
                                            {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>

                                    {/* Middle: Info */}
                                    <div className="info-box">
                                        <div className="info-day">
                                            {new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                        </div>
                                        <div className="info-doctor">
                                            Dr. {appointment.doctorName}
                                        </div>
                                        <div className="info-desc">
                                            {appointment.description || 'General Consultation'}
                                        </div>
                                        <div className={`status-pill-small ${statusClass}`}>{appointment.status}</div>
                                    </div>

                                    {/* Right: Time */}
                                    <div className="time-box">
                                        {formatTime(appointment.timeSlot)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {
                showModal && (
                    <CreateAppointmentModal
                        walletAddress={walletAddress}
                        userData={userData}
                        onClose={() => setShowModal(false)}
                        onSuccess={() => {
                            setShowModal(false);
                            fetchAppointments();
                            if (onAppointmentCreated) onAppointmentCreated();
                        }}
                    />
                )
            }
        </div >
    );
}

// Create Appointment Modal Component
function CreateAppointmentModal({ walletAddress, userData, onClose, onSuccess }) {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [description, setDescription] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);

    // Fetch doctors on mount
    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            console.log('Fetching doctors...');

            const response = await fetch(`${API_BASE_URL}/api/doctors`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'Success') {
                setDoctors(data.doctors || []);
                console.log(`✅ Loaded ${data.doctors?.length || 0} doctors`);
            } else {
                setError(data.error || 'Failed to load doctors');
            }
        } catch (err) {
            console.error('Error fetching doctors:', err);
            setError(`Failed to load doctors: ${err.message}`);
        } finally {
            setLoadingDoctors(false);
        }
    };

    // Helper function to format time for display
    const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Generate time slots (9 AM to 5 PM, 30-minute intervals)
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = 9; hour < 17; hour++) {
            const startTime1 = `${hour.toString().padStart(2, '0')}:00`;
            const endTime1 = `${hour.toString().padStart(2, '0')}:30`;
            slots.push({
                value: startTime1,
                label: `${formatTime(startTime1)} - ${formatTime(endTime1)}`
            });

            if (hour < 16) {
                const startTime2 = `${hour.toString().padStart(2, '0')}:30`;
                const endHour = hour + 1;
                const endTime2 = `${endHour.toString().padStart(2, '0')}:00`;
                slots.push({
                    value: startTime2,
                    label: `${formatTime(startTime2)} - ${formatTime(endTime2)}`
                });
            }
        }
        return slots;
    };

    const allTimeSlots = generateTimeSlots();

    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const getMaxDate = () => {
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        return maxDate.toISOString().split('T')[0];
    };

    const isWeekday = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDay();
        return day >= 1 && day <= 5;
    };

    // FIXED: Fetch available slots when date OR doctor changes
    useEffect(() => {
        if (selectedDate && selectedDoctor) {
            console.log('Checking availability:', { date: selectedDate, doctor: selectedDoctor });

            if (isWeekday(selectedDate)) {
                fetchDoctorSchedule();
            } else {
                setError('Please select a weekday (Monday-Friday)');
                setAvailableSlots([]);
            }
        } else {
            setAvailableSlots([]);
            setSelectedTime(''); // Clear time selection when date/doctor changes
        }
    }, [selectedDate, selectedDoctor]);

    const fetchDoctorSchedule = async () => {
        setLoadingSlots(true);
        setError(null);

        try {
            console.log(`Fetching schedule for doctor: ${selectedDoctor} on ${selectedDate}`);

            const response = await fetch(
                `${API_BASE_URL}/api/doctors/${selectedDoctor}/schedule?date=${selectedDate}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            console.log('Schedule response:', data);

            if (data.status === 'Success') {
                // Filter allTimeSlots to only show available ones
                const available = allTimeSlots.filter(slot =>
                    data.availableSlots.includes(slot.value)
                );

                setAvailableSlots(available);

                console.log(`✅ ${available.length} slots available for this doctor`);

                // If previously selected time is no longer available, clear it
                if (selectedTime && !data.availableSlots.includes(selectedTime)) {
                    setSelectedTime('');
                    setError('Previously selected time is no longer available');
                }
            } else {
                console.error('Failed to fetch schedule:', data.error);
                setAvailableSlots([]);
                setError(data.error || 'Failed to load available time slots');
            }
        } catch (err) {
            console.error('Error fetching doctor schedule:', err);
            setAvailableSlots([]);
            setError(`Could not load available times: ${err.message}`);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (!isWeekday(selectedDate)) {
            setError('Appointments are only available Monday-Friday');
            setLoading(false);
            return;
        }

        if (!selectedTime) {
            setError('Please select a time slot');
            setLoading(false);
            return;
        }

        try {
            const selectedDoctorData = doctors.find(d => d.walletAddress === selectedDoctor);

            const appointmentPayload = {
                walletAddress: walletAddress.toLowerCase(),
                patientName: userData?.fullName || 'Patient',
                date: selectedDate,
                timeSlot: selectedTime,
                doctorId: selectedDoctor.toLowerCase(), // Send doctor's wallet address
                doctorName: selectedDoctorData?.fullName || 'Doctor',
                description: description.trim() || ''
            };

            console.log('Creating appointment:', appointmentPayload);

            const response = await fetch(`${API_BASE_URL}/api/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentPayload)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (data.status === 'Success') {
                console.log('✅ Appointment created successfully!');
                onSuccess(); // This will close modal and refresh the appointments list
            } else {
                setError(data.error || 'Failed to create appointment');
            }
        } catch (err) {
            console.error('❌ Error creating appointment:', err);
            setError(err.message || 'Failed to create appointment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content appointment-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Create New Appointment</h2>

                <form onSubmit={handleSubmit} className="appointment-form">
                    <div className="form-group">
                        <label>Select Doctor *</label>
                        <select
                            value={selectedDoctor}
                            onChange={(e) => {
                                setSelectedDoctor(e.target.value);
                                setSelectedDate('');
                                setSelectedTime('');
                                setError(null);
                            }}
                            required
                            disabled={loadingDoctors}
                            className="form-input"
                        >
                            <option value="">
                                {loadingDoctors ? 'Loading doctors...' : 'Choose a doctor'}
                            </option>
                            {doctors.map((doctor) => (
                                <option key={doctor.walletAddress} value={doctor.walletAddress}>
                                    {doctor.fullName} - {doctor.specialty || 'General Practitioner'}
                                </option>
                            ))}
                        </select>
                        <small className="form-hint">
                            {doctors.length === 0 && !loadingDoctors
                                ? 'No doctors available. Please register as a doctor first.'
                                : `${doctors.length} doctor(s) available`}
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Select Date *</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSelectedTime('');
                                setError(null);
                            }}
                            min={getMinDate()}
                            max={getMaxDate()}
                            required
                            disabled={!selectedDoctor}
                            className="form-input"
                        />
                        <small className="form-hint">
                            {!selectedDoctor
                                ? 'Please select a doctor first'
                                : 'Appointments available Monday-Friday only'}
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Select Time Slot *</label>
                        <select
                            value={selectedTime}
                            onChange={(e) => {
                                setSelectedTime(e.target.value);
                                setError(null);
                            }}
                            required
                            disabled={!selectedDate || !isWeekday(selectedDate) || loadingSlots || availableSlots.length === 0}
                            className="form-input"
                        >
                            <option value="">
                                {loadingSlots
                                    ? 'Loading available slots...'
                                    : availableSlots.length === 0 && selectedDate
                                        ? 'No slots available'
                                        : 'Choose a time slot'}
                            </option>
                            {availableSlots.map((slot) => (
                                <option key={slot.value} value={slot.value}>
                                    {slot.label}
                                </option>
                            ))}
                        </select>
                        <small className="form-hint">
                            {!selectedDoctor || !selectedDate
                                ? 'Select doctor and date first'
                                : loadingSlots
                                    ? 'Checking doctor availability...'
                                    : availableSlots.length === 0 && selectedDate
                                        ? 'No available slots for this doctor on this date'
                                        : `${availableSlots.length} slot(s) available`}
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of your concern"
                            rows="3"
                            className="form-input"
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-buttons">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cancel-button"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedDoctor || !selectedDate || !selectedTime || availableSlots.length === 0}
                            className="save-button"
                        >
                            {loading ? 'Creating...' : 'Create Appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default PatientAppointments;