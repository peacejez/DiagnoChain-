// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PredictionStore {
    // Structure to hold the key prediction proof data
    struct PredictionRecord {
        address patientAddress;
        string symptomsHash; // Hashed input for privacy
        string topPrediction; 
        uint256 timestamp;
    }

    // Mapping to store records (optional, but useful for verification)
    mapping(uint256 => PredictionRecord) public records;
    uint256 public recordCount;

    // Event emitted upon successful data storage (generates the Tx Hash)
    event PredictionLogged(address indexed patient, uint256 recordId, string prediction);

    function logPrediction(
        string memory _symptomsHash,
        string memory _topPrediction
    ) public {
        recordCount++;
        records[recordCount] = PredictionRecord(
            msg.sender, // The sender (patient's wallet) is logged
            _symptomsHash,
            _topPrediction,
            block.timestamp
        );
        
        emit PredictionLogged(msg.sender, recordCount, _topPrediction);
    }
}