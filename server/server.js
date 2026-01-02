const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { ethers } = require('ethers');
const crypto = require('crypto');
const { PythonShell } = require('python-shell');
const admin = require('firebase-admin');
const path = require('path');

//Setup dotenv immediately to load secrets
require('dotenv').config({ path: './.env' });

const app = express();
const PORT = 3001;

// --- BLOCKCHAIN INTERACTION ---

//Define Contract ABI
const PREDICTION_CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_walletAddress", "type": "address" },
            { "internalType": "string", "name": "_fullNameHash", "type": "string" },
            { "internalType": "string", "name": "_nricHash", "type": "string" },
            { "internalType": "string", "name": "_email", "type": "string" },
            { "internalType": "string", "name": "_role", "type": "string" }
        ],
        "name": "registerUser",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_address", "type": "address" }
        ],
        "name": "getUserDetails",
        "outputs": [
            { "internalType": "address", "name": "walletAddress", "type": "address" },
            { "internalType": "string", "name": "fullNameHash", "type": "string" },
            { "internalType": "string", "name": "nricHash", "type": "string" },
            { "internalType": "string", "name": "email", "type": "string" },
            { "internalType": "string", "name": "role", "type": "string" },
            { "internalType": "uint256", "name": "registeredAt", "type": "uint256" },
            { "internalType": "bool", "name": "isActive", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_address", "type": "address" }
        ],
        "name": "isUserRegistered",
        "outputs": [
            { "internalType": "bool", "name": "", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    // Prediction Functions
    {
        "inputs": [
            { "internalType": "string", "name": "_symptomsHash", "type": "string" },
            { "internalType": "string", "name": "_topPrediction", "type": "string" }
        ],
        "name": "logPrediction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "recordId", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "prediction", "type": "string" }
        ],
        "name": "PredictionLogged",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "recordCount",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "userCount",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "records",
        "outputs": [
            { "internalType": "address", "name": "patientAddress", "type": "address" },
            { "internalType": "string", "name": "symptomsHash", "type": "string" },
            { "internalType": "string", "name": "topPrediction", "type": "string" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "name": "users",
        "outputs": [
            { "internalType": "address", "name": "walletAddress", "type": "address" },
            { "internalType": "string", "name": "fullNameHash", "type": "string" },
            { "internalType": "string", "name": "nricHash", "type": "string" },
            { "internalType": "string", "name": "email", "type": "string" },
            { "internalType": "string", "name": "role", "type": "string" },
            { "internalType": "uint256", "name": "registeredAt", "type": "uint256" },
            { "internalType": "bool", "name": "isActive", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "userAddresses",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// 3. Setup Ethers Provider and Signer
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_NETWORK_URL);
const serverSigner = new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, provider);

// 4. Contract Instance
const predictionContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    PREDICTION_CONTRACT_ABI,
    serverSigner
);
// ---------------------------------------------------------------------

// --- FIREBASE INITIALIZATION (ADMIN SDK) ---
// Load credentials path from .env (e.g., './firebase-credentials.json')
const serviceAccountPath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // Get the Firestore database instance
// -------------------------------------------


// --- Middleware ---
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(bodyParser.json());

const nonces = {}; // In-memory store for nonces

// A. Get Challenge Route (No changes)
app.get('/api/challenge', (req, res) => {
    const address = req.query.address;
    if (!address) return res.status(400).json({ error: 'Address required.' });
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = `Sign this message to log in. Nonce: ${nonce}`;
    nonces[address.toLowerCase()] = { nonce, timestamp: Date.now() };
    console.log(`Challenge issued for ${address}: Sign this message...`);
    res.json({ message });
});

// B. Login/Verification Route (No changes)
app.post('/api/login', (req, res) => {
    const { address, message, signature } = req.body;
    const lowerCaseAddress = address.toLowerCase();

    const storedData = nonces[lowerCaseAddress];
    if (!storedData) return res.status(401).json({ error: 'No active challenge found or challenge expired.' });
    if (!message.includes(storedData.nonce)) return res.status(401).json({ error: 'Message structure mismatch or nonce invalid.' });

    try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() === lowerCaseAddress) {
            delete nonces[lowerCaseAddress];
            const token = `JWT_MOCK_${crypto.randomBytes(8).toString('hex')}`;
            console.log(`Login successful for: ${address}`);
            return res.json({ status: 'Success', token: token, userId: lowerCaseAddress });
        }
    } catch (error) {
        console.error("Signature verification error:", error);
    }
    res.status(401).json({ error: 'Signature verification failed.' });
});

// C. Prediction API Endpoint - UPDATED TO USE AI-MODEL FOLDER
app.post('/api/predict', (req, res) => {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptom text is required for prediction.' });

    console.log(`Received prediction request for symptoms: "${symptoms.substring(0, 50)}..."`);

    const aiModelPath = path.join(__dirname, '../ai-model');

    let options = {
        mode: 'text',
        pythonPath: 'python',
        scriptPath: aiModelPath,
        cwd: aiModelPath,  // CRITICAL: Sets working directory to ai-model folder
        args: [symptoms]
    };

    PythonShell.run('api_predict.py', options).then(messages => {
        try {
            // Filter out warnings and get only the JSON result
            const jsonOutput = messages.find(msg => {
                const trimmed = msg.trim();
                return trimmed.startsWith('[') || trimmed.startsWith('{');
            });

            if (!jsonOutput) {
                console.error("No JSON output from Python:", messages);
                return res.status(500).json({ error: 'Failed to get prediction from model.' });
            }

            const results = JSON.parse(jsonOutput);

            if (results.error) {
                return res.status(400).json(results);
            }

            return res.json({ status: 'Success', predictions: results });
        } catch (e) {
            console.error("Error parsing Python output:", messages, e);
            return res.status(500).json({ error: 'Failed to parse prediction output.' });
        }
    }).catch(err => {
        console.error("PythonShell execution failed:", err);
        res.status(500).json({ error: `Prediction service error: ${err.message}` });
    });
});

// E. Get Diagnosis History API - FIXED VERSION
app.get('/api/history/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;

    // IMPORTANT: Ensure the address is correctly lowercased for the query
    const addressToQuery = walletAddress.toLowerCase();

    try {
        // Option 1: Without orderBy (no index needed)
        const snapshot = await db.collection('diagnosis_records')
            .where('walletAddress', '==', addressToQuery)
            .get();

        // Sort in JavaScript after fetching
        const history = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

        // Log success to the terminal
        console.log(`Successfully fetched ${history.length} history records for ${addressToQuery}`);

        // Return the array of history records
        return res.json({ status: 'Success', history });

    } catch (error) {
        // This catch block handles potential Firebase connection errors or query failures
        console.error("CRITICAL ERROR fetching history:", error);
        return res.status(500).json({ error: `Failed to fetch diagnosis history: ${error.message}` });
    }
});

// F. Check if User Exists
app.get('/api/user/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    const addressToQuery = walletAddress.toLowerCase();

    try {
        const userDoc = await db.collection('users').doc(addressToQuery).get();

        if (userDoc.exists) {
            return res.json({
                exists: true,
                user: {
                    walletAddress: addressToQuery,
                    ...userDoc.data()
                }
            });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking user:', error);
        return res.status(500).json({ error: 'Failed to check user existence' });
    }
});

// G. Register New User
// G. Register New User - WITH BLOCKCHAIN STORAGE
// G. Register New User - FIXED VERSION
app.post('/api/register', async (req, res) => {
    const { walletAddress, fullName, nric, email, phoneNumber, dateOfBirth, role, profilePicture } = req.body;

    console.log('=== USER REGISTRATION WITH BLOCKCHAIN ===');
    console.log('Wallet:', walletAddress);
    console.log('Name:', fullName);
    console.log('Role:', role);

    // Validation
    if (!walletAddress || !fullName || !nric || !email || !role) {
        return res.status(400).json({
            error: 'Missing required fields: walletAddress, fullName, nric, email, role'
        });
    }

    if (role !== 'patient' && role !== 'doctor') {
        return res.status(400).json({
            error: 'Role must be either "patient" or "doctor"'
        });
    }

    const addressToStore = walletAddress.toLowerCase();

    try {
        // Check if user exists in Firebase
        const existingUser = await db.collection('users').doc(addressToStore).get();

        if (existingUser.exists) {
            return res.status(400).json({
                error: 'User already registered with this wallet address'
            });
        }

        // Create hashes for blockchain
        const fullNameHash = crypto.createHash('sha256').update(fullName).digest('hex');
        const nricHash = crypto.createHash('sha256').update(nric).digest('hex');

        // ✅ FIXED: Pass wallet address as first parameter
        const tx = await predictionContract.registerUser(
            walletAddress,  // ✅ ADDED THIS
            fullNameHash,
            nricHash,
            email,
            role
        );

        console.log('Transaction sent:', tx.hash);
        const receipt = await tx.wait();

        if (!receipt) {
            throw new Error("Transaction failed to be mined");
        }

        const txHash = receipt.hash;
        const blockNumber = receipt.blockNumber;

        console.log('✅ Blockchain transaction confirmed!');
        console.log('TxHash:', txHash);

        const block = await provider.getBlock(blockNumber);
        const blockTimestamp = new Date(block.timestamp * 1000).toISOString();

        // Store in Firebase with blockchain info
        const userData = {
            walletAddress: addressToStore,
            fullName,
            nric,
            email,
            phoneNumber: phoneNumber || null,
            dateOfBirth: dateOfBirth || null,
            role,
            profilePicture: profilePicture || null,
            registeredAt: new Date().toISOString(),
            isActive: true,
            blockchainTxHash: txHash,
            blockchainBlock: blockNumber,
            blockchainTimestamp: blockTimestamp,
            fullNameHash: fullNameHash,
            nricHash: nricHash,
            onChain: true
        };

        await db.collection('users').doc(addressToStore).set(userData);

        console.log('✅ Registration successful!');
        console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);

        return res.json({
            status: 'Success',
            message: 'User registered successfully on blockchain and database',
            user: userData,
            blockchain: {
                txHash: txHash,
                blockNumber: blockNumber,
                timestamp: blockTimestamp,
                explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`
            }
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.message.includes('User already registered')) {
            return res.status(400).json({
                error: 'User already registered on blockchain',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Failed to register user',
            details: error.message
        });
    }
});

// H. Update User Profile (Optional - for future use)
app.put('/api/user/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    const addressToUpdate = walletAddress.toLowerCase();
    const updates = req.body;

    // Don't allow updating walletAddress or registeredAt
    delete updates.walletAddress;
    delete updates.registeredAt;

    console.log(`Updating profile for: ${addressToUpdate}`);
    console.log('Update fields:', Object.keys(updates));
    console.log('Has profile picture:', !!updates.profilePicture);

    try {
        // Check if document exists first
        const docRef = db.collection('users').doc(addressToUpdate);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log('User not found:', addressToUpdate);
            return res.status(404).json({
                error: 'User not found'
            });
        }

        await docRef.update({
            ...updates,
            updatedAt: new Date().toISOString()
        });

        console.log(`Profile updated successfully for: ${addressToUpdate}`);

        return res.json({
            status: 'Success',
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update error:', error);
        return res.status(500).json({
            error: `Failed to update profile: ${error.message}`
        });
    }
});

// ============================================
// APPOINTMENTS API ENDPOINTS - ADD TO server.js
// ============================================

// I. Get User Appointments
app.get('/api/appointments/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    const addressToQuery = walletAddress.toLowerCase();

    console.log('Fetching appointments for:', addressToQuery);

    try {
        // Fetch without orderBy first (to avoid index requirement)
        const snapshot = await db.collection('appointments')
            .where('walletAddress', '==', addressToQuery)
            .get();

        // Sort in JavaScript instead
        const appointments = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => {
                // Sort by date first, then by timeSlot
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                return a.timeSlot.localeCompare(b.timeSlot);
            });

        console.log(`✅ Fetched ${appointments.length} appointments for ${addressToQuery}`);

        return res.json({
            status: 'Success',
            appointments
        });

    } catch (error) {
        console.error('❌ Error fetching appointments:', error);
        return res.status(500).json({
            status: 'Error',
            error: `Failed to fetch appointments: ${error.message}`
        });
    }
});

// J. Create New Appointment (FIXED VERSION - Remove duplicates and use this only)
app.post('/api/appointments', async (req, res) => {
    console.log('=== CREATE APPOINTMENT REQUEST ===');
    console.log('Request body:', req.body);

    const {
        walletAddress,
        patientName,
        date,
        timeSlot,
        doctorId, // This is the doctor's walletAddress
        doctorName,
        description
    } = req.body;

    // Validation
    if (!walletAddress || !date || !timeSlot || !doctorId) {
        console.log('❌ Missing required fields');
        return res.status(400).json({
            error: 'Missing required fields: walletAddress, date, timeSlot, doctorId'
        });
    }

    // Validate date is a weekday
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log('❌ Weekend date selected:', date);
        return res.status(400).json({
            error: 'Appointments only available Monday-Friday'
        });
    }

    try {
        // CRITICAL FIX: Check if slot is already taken for THIS specific doctor
        // Using doctorId as wallet address (string comparison)
        const existingSlot = await db.collection('appointments')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('doctorId', '==', doctorId.toLowerCase()) // Ensure lowercase comparison
            .where('status', 'in', ['Pending', 'Confirmed'])
            .get();

        if (!existingSlot.empty) {
            console.log('❌ Slot already booked:', {
                date,
                timeSlot,
                doctorId,
                existingAppointments: existingSlot.size
            });
            return res.status(400).json({
                error: 'This time slot is already booked for the selected doctor'
            });
        }

        // Create appointment with consistent data structure
        const appointmentData = {
            walletAddress: walletAddress.toLowerCase(),
            patientName: patientName || 'Patient',
            date,
            timeSlot,
            doctorId: doctorId.toLowerCase(), // Store doctor's wallet address (lowercase)
            doctorName: doctorName || 'Doctor',
            description: description || '',
            status: 'Pending',
            createdAt: new Date().toISOString()
        };

        console.log('✅ Creating appointment:', appointmentData);

        const docRef = await db.collection('appointments').add(appointmentData);

        console.log(`✅ SUCCESS! Appointment created: ${docRef.id}`);
        console.log(`   Patient: ${patientName}`);
        console.log(`   Doctor: ${doctorName}`);
        console.log(`   Date: ${date} at ${timeSlot}`);

        return res.json({
            status: 'Success',
            message: 'Appointment created successfully',
            appointmentId: docRef.id
        });

    } catch (error) {
        console.error('❌ Error creating appointment:', error);
        return res.status(500).json({
            error: `Failed to create appointment: ${error.message}`
        });
    }
});

// K. Get Available Time Slots for a Date and Doctor (UPDATED)
app.get('/api/appointments/available-slots', async (req, res) => {
    const { date, doctorId } = req.query;

    console.log('Checking available slots:', { date, doctorId });

    if (!date) {
        return res.status(400).json({
            error: 'Date is required'
        });
    }

    try {
        // Build query based on whether doctorId is provided
        let query = db.collection('appointments')
            .where('date', '==', date)
            .where('status', 'in', ['Pending', 'Confirmed']);

        // If doctorId is specified, filter by that doctor
        if (doctorId) {
            query = query.where('doctorId', '==', doctorId.toLowerCase());
        }

        const bookedSlots = await query.get();

        // Extract booked time slots
        const bookedTimes = bookedSlots.docs.map(doc => doc.data().timeSlot);

        console.log(`Found ${bookedTimes.length} booked slots for ${date}${doctorId ? ` (Doctor: ${doctorId})` : ''}`);

        // Generate all possible slots (9 AM to 5 PM, 30-min intervals)
        const allSlots = [];
        for (let hour = 9; hour < 17; hour++) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }

        // Filter out booked slots
        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        console.log(`${availableSlots.length} slots available`);

        return res.json({
            status: 'Success',
            availableSlots,
            bookedSlots: bookedTimes
        });

    } catch (error) {
        console.error('Error fetching available slots:', error);
        return res.status(500).json({
            error: 'Failed to fetch available slots'
        });
    }
});

// L. Update Appointment Status (FIXED VERSION)
app.put('/api/appointments/:appointmentId', async (req, res) => {
    const { appointmentId } = req.params;
    const { status } = req.body;

    console.log('=== UPDATE APPOINTMENT STATUS ===');
    console.log('Appointment ID:', appointmentId);
    console.log('New Status:', status);

    if (!status) {
        console.log('❌ Missing status in request body');
        return res.status(400).json({
            error: 'Status is required'
        });
    }

    // FIXED: Accept both capitalized and lowercase status values
    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'Rejected'];

    // Normalize the status to match our database format (capitalize first letter)
    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    if (!validStatuses.includes(normalizedStatus)) {
        console.log('❌ Invalid status:', status);
        console.log('Valid statuses are:', validStatuses.join(', '));
        return res.status(400).json({
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    try {
        // Check if appointment exists
        const appointmentRef = db.collection('appointments').doc(appointmentId);
        const doc = await appointmentRef.get();

        if (!doc.exists) {
            console.log('❌ Appointment not found:', appointmentId);
            return res.status(404).json({
                error: 'Appointment not found'
            });
        }

        // Update the appointment
        await appointmentRef.update({
            status: normalizedStatus,
            updatedAt: new Date().toISOString()
        });

        console.log(`✅ Appointment ${appointmentId} status updated to: ${normalizedStatus}`);

        return res.json({
            status: 'Success',
            message: 'Appointment updated successfully',
            newStatus: normalizedStatus
        });

    } catch (error) {
        console.error('❌ Error updating appointment:', error);
        return res.status(500).json({
            error: `Failed to update appointment: ${error.message}`
        });
    }
});

// ============================================
// DOCTOR SCHEDULE & AVAILABILITY ENDPOINTS
// Add these to server.js
// ============================================

// M. Get All Doctors (registered users with role='doctor')
app.get('/api/doctors', async (req, res) => {
    console.log('Fetching all doctors...');

    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'doctor')
            .where('isActive', '==', true)
            .get();

        const doctors = snapshot.docs.map(doc => ({
            id: doc.id,
            walletAddress: doc.data().walletAddress,
            fullName: doc.data().fullName,
            email: doc.data().email,
            phoneNumber: doc.data().phoneNumber,
            profilePicture: doc.data().profilePicture,
            specialty: doc.data().specialty || 'General Practitioner'
        }));

        console.log(`✅ Found ${doctors.length} active doctors`);

        return res.json({
            status: 'Success',
            doctors
        });

    } catch (error) {
        console.error('❌ Error fetching doctors:', error);
        return res.status(500).json({
            status: 'Error',
            error: `Failed to fetch doctors: ${error.message}`
        });
    }
});

// N. Get Doctor's Schedule for a specific date
app.get('/api/doctors/:doctorId/schedule', async (req, res) => {
    const { doctorId } = req.params;
    const { date } = req.query;

    console.log(`Fetching schedule for doctor ${doctorId} on ${date}`);

    if (!date) {
        return res.status(400).json({
            error: 'Date parameter is required'
        });
    }

    try {
        // Check if doctor has a custom schedule for this date
        const scheduleDoc = await db.collection('doctor_schedules')
            .doc(doctorId)
            .collection('dates')
            .doc(date)
            .get();

        let availableSlots = [];

        if (scheduleDoc.exists) {
            // Doctor has a custom schedule for this date
            const scheduleData = scheduleDoc.data();
            availableSlots = scheduleData.availableSlots || [];
        } else {
            // Use default schedule (9 AM to 5 PM, Monday-Friday)
            const appointmentDate = new Date(date);
            const dayOfWeek = appointmentDate.getDay();

            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                // Generate default slots
                for (let hour = 9; hour < 17; hour++) {
                    availableSlots.push(`${hour.toString().padStart(2, '0')}:00`);
                    availableSlots.push(`${hour.toString().padStart(2, '0')}:30`);
                }
            }
        }

        // Get booked appointments for this doctor on this date
        const bookedAppointments = await db.collection('appointments')
            .where('doctorId', '==', doctorId)
            .where('date', '==', date)
            .where('status', 'in', ['Pending', 'Confirmed'])
            .get();

        const bookedSlots = bookedAppointments.docs.map(doc => doc.data().timeSlot);

        // Filter out booked slots
        const availableTimeslots = availableSlots.filter(slot => !bookedSlots.includes(slot));

        console.log(`✅ Doctor ${doctorId} has ${availableTimeslots.length} available slots on ${date}`);

        return res.json({
            status: 'Success',
            date,
            doctorId,
            availableSlots: availableTimeslots,
            bookedSlots
        });

    } catch (error) {
        console.error('❌ Error fetching doctor schedule:', error);
        return res.status(500).json({
            status: 'Error',
            error: `Failed to fetch schedule: ${error.message}`
        });
    }
});

// O. Set Doctor's Schedule (for doctors to manage their availability)
app.post('/api/doctors/:doctorId/schedule', async (req, res) => {
    const { doctorId } = req.params;
    const { date, availableSlots, isAvailable } = req.body;

    console.log(`Setting schedule for doctor ${doctorId} on ${date}`);

    if (!date) {
        return res.status(400).json({
            error: 'Date is required'
        });
    }

    try {
        const scheduleData = {
            doctorId,
            date,
            availableSlots: availableSlots || [],
            isAvailable: isAvailable !== false, // Default to available
            updatedAt: new Date().toISOString()
        };

        await db.collection('doctor_schedules')
            .doc(doctorId)
            .collection('dates')
            .doc(date)
            .set(scheduleData, { merge: true });

        console.log(`✅ Schedule set for doctor ${doctorId} on ${date}`);

        return res.json({
            status: 'Success',
            message: 'Schedule updated successfully',
            schedule: scheduleData
        });

    } catch (error) {
        console.error('❌ Error setting schedule:', error);
        return res.status(500).json({
            status: 'Error',
            error: `Failed to set schedule: ${error.message}`
        });
    }
});

// Q. Get Appointments for a Specific Doctor
app.get('/api/doctors/:doctorWallet/appointments', async (req, res) => {
    const { doctorWallet } = req.params;
    const doctorId = doctorWallet.toLowerCase();

    console.log('Fetching appointments for doctor:', doctorId);

    try {
        // Fetch all appointments for this doctor
        const snapshot = await db.collection('appointments')
            .where('doctorId', '==', doctorId)
            .get();

        // Sort in JavaScript after fetching
        const appointments = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => {
                // Sort by date first (ascending - soonest first)
                const dateCompare = new Date(a.date) - new Date(b.date);
                if (dateCompare !== 0) return dateCompare;
                // Then by time slot
                return a.timeSlot.localeCompare(b.timeSlot);
            });

        console.log(`✅ Fetched ${appointments.length} appointments for doctor ${doctorId}`);

        return res.json({
            status: 'Success',
            appointments
        });

    } catch (error) {
        console.error('❌ Error fetching doctor appointments:', error);
        return res.status(500).json({
            status: 'Error',
            error: `Failed to fetch appointments: ${error.message}`
        });
    }
});


// ADD THESE ENDPOINTS TO YOUR server.js

// ============================================
// CASE VERIFICATION ENDPOINTS
// ============================================

// R. Get All Cases (for doctor review)
app.get('/api/cases', async (req, res) => {
    console.log('Fetching all cases for review...');

    try {
        // Fetch all diagnosis records that have been stored
        const snapshot = await db.collection('diagnosis_records')
            .get();

        const cases = snapshot.docs.map(doc => ({
            id: doc.id,
            patientWallet: doc.data().walletAddress,
            patientName: doc.data().patientName || 'Unknown Patient',
            symptoms: doc.data().symptoms,
            aiDiagnosis: doc.data().prediction,
            confidence: doc.data().confidence || 0,
            description: doc.data().description || '',
            precautions: doc.data().precautions || [],
            otherPossibilities: doc.data().otherPossibilities || [],
            verificationStatus: doc.data().verificationStatus || 'Pending Verify',
            reviewedBy: doc.data().reviewedBy || null,
            reviewedAt: doc.data().reviewedAt || null,
            doctorNotes: doc.data().doctorNotes || '',
            txHash: doc.data().txHash || null,
            createdAt: doc.data().date || new Date().toISOString(),
        }));

        // Sort by date (newest first)
        cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`✅ Fetched ${cases.length} cases`);

        return res.json({
            status: 'Success',
            cases
        });

    } catch (error) {
        console.error('❌ Error fetching cases:', error);
        return res.status(500).json({
            status: 'Error',
            error: `Failed to fetch cases: ${error.message}`
        });
    }
});

// S. Update Case Verification Status
app.put('/api/cases/:caseId', async (req, res) => {
    const { caseId } = req.params;
    const { status, doctorWallet, doctorName, doctorNotes, reviewedAt } = req.body;

    console.log('=== UPDATE CASE VERIFICATION ===');
    console.log('Case ID:', caseId);
    console.log('New Status:', status);
    console.log('Doctor:', doctorName);

    // Validate status
    const validStatuses = ['Pending Verify', 'Answer Accepted', 'Answer Rejected', 'Need Further Checking'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    try {
        // Check if case exists
        const caseRef = db.collection('diagnosis_records').doc(caseId);
        const doc = await caseRef.get();

        if (!doc.exists) {
            console.log('❌ Case not found:', caseId);
            return res.status(404).json({
                error: 'Case not found'
            });
        }

        // Update the case
        await caseRef.update({
            verificationStatus: status,
            reviewedBy: doctorName,
            reviewedByWallet: doctorWallet,
            reviewedAt: reviewedAt || new Date().toISOString(),
            doctorNotes: doctorNotes || '',
            updatedAt: new Date().toISOString()
        });

        console.log(`✅ Case ${caseId} status updated to: ${status}`);
        console.log(`   Reviewed by: ${doctorName}`);

        return res.json({
            status: 'Success',
            message: 'Case verification updated successfully',
            newStatus: status
        });

    } catch (error) {
        console.error('❌ Error updating case:', error);
        return res.status(500).json({
            error: `Failed to update case: ${error.message}`
        });
    }
});

// T. Get Cases by Status
app.get('/api/cases/status/:status', async (req, res) => {
    const { status } = req.params;

    console.log(`Fetching cases with status: ${status}`);

    try {
        let query = db.collection('diagnosis_records');

        // If not "all", filter by status
        if (status !== 'all') {
            query = query.where('verificationStatus', '==', status);
        }

        const snapshot = await query.get();

        const cases = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        console.log(`✅ Found ${cases.length} cases with status: ${status}`);

        return res.json({
            status: 'Success',
            cases
        });

    } catch (error) {
        console.error('❌ Error fetching cases by status:', error);
        return res.status(500).json({
            status: 'Error',
            error: `Failed to fetch cases: ${error.message}`
        });
    }
});

// U. Update store-proof endpoint to save more details for case review
// REPLACE your existing /api/store-proof endpoint with this enhanced version
app.post('/api/store-proof', async (req, res) => {
    const { walletAddress, symptoms, prediction } = req.body;

    console.log('==========================================');
    console.log('=== STORE PROOF REQUEST (NEW VERSION) ===');
    console.log('==========================================');
    console.log('Wallet:', walletAddress);
    console.log('Symptoms:', symptoms);
    console.log('Prediction array:', prediction);
    console.log('Number of predictions:', prediction?.length);

    if (!walletAddress || !symptoms || !prediction || prediction.length === 0) {
        console.log('❌ Missing required data');
        return res.status(400).json({ error: 'Missing required data for storage.' });
    }

    try {
        // ===== STEP 1: EXTRACT PREDICTION DATA =====
        const topPrediction = prediction[0];
        console.log('\n📊 Top Prediction:', topPrediction);

        const disease = topPrediction.disease;
        const confidence = topPrediction.confidence || 0;
        const description = topPrediction.description || 'No description available';
        const precautions = topPrediction.precautions || [];

        console.log('   Disease:', disease);
        console.log('   Confidence:', confidence, typeof confidence);
        console.log('   Description:', description.substring(0, 50) + '...');
        console.log('   Precautions:', precautions);

        // Extract other possibilities
        const otherPossibilities = prediction.slice(1).map(p => ({
            disease: p.disease,
            confidence: p.confidence || 0
        }));
        console.log('   Other possibilities:', otherPossibilities);

        // ===== STEP 2: GET PATIENT NAME =====
        let patientName = 'Unknown Patient';
        let patientEmail = null;

        try {
            console.log('\n👤 Fetching patient info for:', walletAddress.toLowerCase());
            const userDoc = await db.collection('users').doc(walletAddress.toLowerCase()).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                patientName = userData.fullName || 'Unknown Patient';
                patientEmail = userData.email || null;
                console.log('   ✅ Found patient:', patientName);
                console.log('   Email:', patientEmail);
            } else {
                console.log('   ⚠️ Patient not registered in users collection');
            }
        } catch (err) {
            console.log('   ❌ Error fetching patient:', err.message);
        }

        // ===== STEP 3: PREPARE FIRESTORE RECORD =====
        const firestoreRecord = {
            // Patient Info
            walletAddress: walletAddress.toLowerCase(),
            patientName: patientName,
            patientEmail: patientEmail,

            // Diagnosis Info
            symptoms: symptoms,
            prediction: disease,
            aiDiagnosis: disease, // Alias for compatibility
            confidence: Number(confidence), // Ensure it's a number
            description: description,
            precautions: precautions,
            otherPossibilities: otherPossibilities,

            // Verification Info
            verificationStatus: 'Pending Verify',
            reviewedBy: null,
            reviewedByWallet: null,
            reviewedAt: null,
            doctorNotes: '',

            // Status Info
            status: 'Pending Doctor Review',

            // Timestamps
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),

            // Blockchain Info (will be updated after transaction)
            txHash: null,
        };

        console.log('\n💾 Firestore Record to Save:');
        console.log(JSON.stringify(firestoreRecord, null, 2));

        // ===== STEP 4: SAVE TO FIRESTORE =====
        console.log('\n📤 Saving to Firestore...');
        const docRef = await db.collection('diagnosis_records').add(firestoreRecord);
        console.log('✅ Saved with ID:', docRef.id);

        // ===== STEP 5: BLOCKCHAIN TRANSACTION =====
        console.log('\n🔗 Creating blockchain transaction...');
        const symptomsHash = crypto.createHash('sha256').update(symptoms).digest('hex');
        console.log('   Symptoms hash:', symptomsHash.substring(0, 20) + '...');

        console.log('   Sending transaction to blockchain...');
        const tx = await predictionContract.logPrediction(symptomsHash, disease);
        console.log('   Transaction sent:', tx.hash);

        console.log('   Waiting for confirmation...');
        const receipt = await tx.wait();

        if (!receipt) {
            throw new Error("Transaction failed to be mined.");
        }

        const txHash = receipt.hash;
        const blockNumber = receipt.blockNumber;
        console.log('   ✅ Transaction confirmed!');
        console.log('   TxHash:', txHash);
        console.log('   Block:', blockNumber);

        // ===== STEP 6: UPDATE FIRESTORE WITH TXHASH =====
        console.log('\n🔄 Updating Firestore with txHash...');
        await docRef.update({
            txHash: txHash,
            blockNumber: blockNumber,
            status: 'Proof Recorded',
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Firestore updated');

        // ===== STEP 7: GET TIMESTAMP =====
        const block = await provider.getBlock(blockNumber);
        const timestamp = new Date(block.timestamp * 1000).toLocaleString('en-US');

        // ===== STEP 8: PREPARE RESPONSE =====
        const responseData = {
            status: 'Success',
            txHash: txHash,
            timestamp: timestamp,
            blockNumber: blockNumber,
            docId: docRef.id,
            patientName: patientName,
            confidence: confidence
        };

        console.log('\n✅✅✅ SUCCESS! ✅✅✅');
        console.log('Response:', JSON.stringify(responseData, null, 2));
        console.log('==========================================\n');

        return res.json(responseData);

    } catch (error) {
        console.error('\n❌❌❌ ERROR! ❌❌❌');
        console.error('Error details:', error);
        console.error('Stack:', error.stack);
        console.error('==========================================\n');

        return res.status(500).json({
            error: "Storage or Blockchain transaction failed.",
            details: error.message
        });
    }
});


// ============================================
// BLOCKCHAIN VERIFICATION ENDPOINTS
// ============================================

// V. Verify User on Blockchain
app.get('/api/verify/user/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;

    console.log('=== VERIFYING USER ON BLOCKCHAIN ===');
    console.log('Wallet:', walletAddress);

    try {
        const userDetails = await predictionContract.getUserDetails(walletAddress);

        const isRegistered = userDetails[6]; // isActive field

        if (!isRegistered) {
            return res.json({
                status: 'Not Found',
                onChain: false,
                message: 'User is not registered on blockchain'
            });
        }

        // Get Firebase data for comparison
        const firebaseDoc = await db.collection('users').doc(walletAddress.toLowerCase()).get();

        let firebaseMatch = false;
        let firebaseData = null;

        if (firebaseDoc.exists) {
            firebaseData = firebaseDoc.data();

            const fbNameHash = crypto.createHash('sha256').update(firebaseData.fullName).digest('hex');
            const fbNricHash = crypto.createHash('sha256').update(firebaseData.nric).digest('hex');

            firebaseMatch = (
                fbNameHash === userDetails[1] &&
                fbNricHash === userDetails[2] &&
                firebaseData.email === userDetails[3] &&
                firebaseData.role === userDetails[4]
            );
        }

        const blockTimestamp = new Date(Number(userDetails[5]) * 1000);

        return res.json({
            status: 'Success',
            onChain: true,
            verified: true,
            blockchain: {
                walletAddress: userDetails[0],
                fullNameHash: userDetails[1],
                nricHash: userDetails[2],
                email: userDetails[3],
                role: userDetails[4],
                registeredAt: blockTimestamp.toISOString(),
                isActive: userDetails[6]
            },
            firebaseMatch: firebaseMatch,
            firebaseData: firebaseData ? {
                fullName: firebaseData.fullName,
                role: firebaseData.role,
                email: firebaseData.email,
                txHash: firebaseData.blockchainTxHash
            } : null
        });

    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({
            status: 'Error',
            error: 'Failed to verify user on blockchain',
            details: error.message
        });
    }
});

// W. Verify Diagnosis on Blockchain
app.get('/api/verify/diagnosis/:recordId', async (req, res) => {
    const { recordId } = req.params;

    console.log('=== VERIFYING DIAGNOSIS ON BLOCKCHAIN ===');
    console.log('Record ID:', recordId);

    try {
        const record = await predictionContract.records(recordId);

        const blockTimestamp = new Date(Number(record[3]) * 1000);

        if (record[0] === '0x0000000000000000000000000000000000000000') {
            return res.json({
                status: 'Not Found',
                onChain: false,
                message: 'Diagnosis record not found on blockchain'
            });
        }

        return res.json({
            status: 'Success',
            onChain: true,
            verified: true,
            blockchain: {
                recordId: recordId,
                patientAddress: record[0],
                symptomsHash: record[1],
                prediction: record[2],
                timestamp: blockTimestamp.toISOString()
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({
            status: 'Error',
            error: 'Failed to verify diagnosis on blockchain',
            details: error.message
        });
    }
});

// X. Get Blockchain Statistics
app.get('/api/blockchain/stats', async (req, res) => {
    console.log('Fetching blockchain statistics...');

    try {
        const userCount = await predictionContract.userCount();
        const recordCount = await predictionContract.recordCount();
        const blockNumber = await provider.getBlockNumber();

        return res.json({
            status: 'Success',
            stats: {
                totalUsers: userCount.toString(),
                totalRecords: recordCount.toString(),
                currentBlock: blockNumber,
                contractAddress: process.env.CONTRACT_ADDRESS,
                network: process.env.ETHEREUM_NETWORK_URL.includes('sepolia') ? 'Sepolia Testnet' : 'Unknown'
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({
            status: 'Error',
            error: 'Failed to fetch blockchain statistics',
            details: error.message
        });
    }
});

// Y. Check Transaction Status
app.get('/api/verify/transaction/:txHash', async (req, res) => {
    const { txHash } = req.params;

    console.log('=== CHECKING TRANSACTION STATUS ===');
    console.log('TxHash:', txHash);

    try {
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt) {
            return res.json({
                status: 'Pending',
                found: false,
                message: 'Transaction is pending or does not exist'
            });
        }

        const transaction = await provider.getTransaction(txHash);
        const block = await provider.getBlock(receipt.blockNumber);

        const success = receipt.status === 1;
        const timestamp = new Date(block.timestamp * 1000);

        return res.json({
            status: success ? 'Success' : 'Failed',
            found: true,
            transaction: {
                hash: txHash,
                blockNumber: receipt.blockNumber,
                from: transaction.from,
                to: transaction.to,
                gasUsed: receipt.gasUsed.toString(),
                timestamp: timestamp.toISOString(),
                success: success,
                explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`
            }
        });

    } catch (error) {
        console.error('Error checking transaction:', error);
        return res.status(500).json({
            status: 'Error',
            error: 'Failed to check transaction status',
            details: error.message
        });
    }
});


// ============================================
// END OF CASE VERIFICATION ENDPOINTS
// ============================================




// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});