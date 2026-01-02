// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserRegistry {
    // ============================================
    // USER REGISTRATION STORAGE
    // ============================================
    
    struct UserRecord {
        address walletAddress;
        string fullNameHash;
        string nricHash;
        string email;
        string role;
        uint256 registeredAt;
        bool isActive;
    }
    
    mapping(address => UserRecord) public users;
    address[] public userAddresses;
    uint256 public userCount;
    
    event UserRegistered(
        address indexed walletAddress, 
        string role, 
        uint256 timestamp
    );
    
    event UserUpdated(
        address indexed walletAddress, 
        uint256 timestamp
    );
    
    // ============================================
    // DIAGNOSIS PREDICTION STORAGE
    // ============================================
    
    struct PredictionRecord {
        address patientAddress;
        string symptomsHash;
        string topPrediction;
        uint256 timestamp;
    }
    
    mapping(uint256 => PredictionRecord) public records;
    uint256 public recordCount;
    
    event PredictionLogged(
        address indexed patient, 
        uint256 recordId, 
        string prediction
    );
    
    // ============================================
    // USER REGISTRATION FUNCTIONS - FIXED
    // ============================================
    
    // Register a new user - FIXED TO ACCEPT WALLET ADDRESS
    function registerUser(
        address _walletAddress,  // ✅ ADDED THIS PARAMETER
        string memory _fullNameHash,
        string memory _nricHash,
        string memory _email,
        string memory _role
    ) public {
        // ✅ FIXED: Check the wallet being registered, not msg.sender
        require(!users[_walletAddress].isActive, "User already registered");
        require(
            keccak256(bytes(_role)) == keccak256(bytes("patient")) || 
            keccak256(bytes(_role)) == keccak256(bytes("doctor")),
            "Role must be 'patient' or 'doctor'"
        );
        
        // ✅ FIXED: Store using the provided wallet address
        users[_walletAddress] = UserRecord({
            walletAddress: _walletAddress,
            fullNameHash: _fullNameHash,
            nricHash: _nricHash,
            email: _email,
            role: _role,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        userAddresses.push(_walletAddress);
        userCount++;
        
        emit UserRegistered(_walletAddress, _role, block.timestamp);
    }
    
    // Update user information
    function updateUser(
        string memory _fullNameHash,
        string memory _nricHash,
        string memory _email
    ) public {
        require(users[msg.sender].isActive, "User not registered");
        
        users[msg.sender].fullNameHash = _fullNameHash;
        users[msg.sender].nricHash = _nricHash;
        users[msg.sender].email = _email;
        
        emit UserUpdated(msg.sender, block.timestamp);
    }
    
    // Check if user is registered
    function isUserRegistered(address _address) public view returns (bool) {
        return users[_address].isActive;
    }
    
    // Get user details
    function getUserDetails(address _address) public view returns (
        address walletAddress,
        string memory fullNameHash,
        string memory nricHash,
        string memory email,
        string memory role,
        uint256 registeredAt,
        bool isActive
    ) {
        UserRecord memory user = users[_address];
        return (
            user.walletAddress,
            user.fullNameHash,
            user.nricHash,
            user.email,
            user.role,
            user.registeredAt,
            user.isActive
        );
    }
    
    // ============================================
    // DIAGNOSIS PREDICTION FUNCTIONS
    // ============================================
    
    function logPrediction(
        string memory _symptomsHash,
        string memory _topPrediction
    ) public {
        recordCount++;
        records[recordCount] = PredictionRecord(
            msg.sender,
            _symptomsHash,
            _topPrediction,
            block.timestamp
        );
        
        emit PredictionLogged(msg.sender, recordCount, _topPrediction);
    }
}