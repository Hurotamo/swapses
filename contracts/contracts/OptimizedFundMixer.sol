// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title OptimizedFundMixer
 * @dev Gas-optimized fund mixing with batch processing and efficient storage patterns
 * Implements practical optimizations without over-engineering
 */
contract OptimizedFundMixer is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;
    
    // Events with indexed parameters for efficient filtering
    event MixingRoundStarted(
        uint256 indexed roundId,
        uint256 indexed minParticipants,
        uint256 indexed maxParticipants,
        uint256 deadline,
        uint256 timestamp
    );
    
    event ParticipantJoined(
        uint256 indexed roundId,
        address indexed participant,
        uint256 indexed amount,
        uint256 timestamp
    );
    
    event MixingRoundCompleted(
        uint256 indexed roundId,
        uint256 indexed totalAmount,
        uint256 indexed participantCount,
        uint256 timestamp
    );
    
    event BatchWithdrawalProcessed(
        uint256 indexed roundId,
        uint256 indexed batchSize,
        uint256 indexed totalAmount,
        uint256 timestamp
    );
    
    event FundsWithdrawn(
        uint256 indexed roundId,
        address indexed recipient,
        uint256 indexed amount,
        uint256 timestamp
    );
    
    // Optimized structs with packed data for gas efficiency
    struct MixingRound {
        uint128 roundId;           // Packed with minParticipants
        uint128 minParticipants;   // Packed with roundId
        uint128 maxParticipants;   // Packed with deadline
        uint128 deadline;          // Packed with maxParticipants
        uint256 totalAmount;
        uint256 participantCount;
        bool isActive;
        bool isCompleted;
        uint256 batchSize;         // For batch processing
        uint256 lastProcessedIndex; // For batch processing
    }
    
    struct Participant {
        address participant;
        uint256 amount;
        bool hasWithdrawn;
        uint256 joinTimestamp;
    }
    
    struct BatchWithdrawal {
        uint256 roundId;
        address[] recipients;
        uint256[] amounts;
        uint256 batchSize;
        uint256 timestamp;
        bool isProcessed;
    }
    
    // Optimized state variables with packed storage
    mapping(uint256 => MixingRound) public mixingRounds;
    mapping(uint256 => mapping(uint256 => Participant)) public roundParticipants; // roundId => index => participant
    mapping(uint256 => BatchWithdrawal) public batchWithdrawals;
    mapping(bytes32 => bool) public nullifiers;
    
    // Packed constants for gas efficiency
    uint256 public constant MIN_DEPOSIT = 0.01 ether;
    uint256 public constant MAX_DEPOSIT = 100 ether;
    uint256 public constant MIN_PARTICIPANTS = 3;
    uint256 public constant MAX_PARTICIPANTS = 20;
    uint256 public constant ROUND_TIMEOUT = 1 hours;
    uint256 public constant WITHDRAWAL_DELAY = 30 minutes;
    uint256 public constant BATCH_SIZE = 10; // Optimal batch size for gas efficiency
    
    uint256 public currentRoundId;
    uint256 public totalRounds;
    uint256 public totalMixedAmount;
    uint256 public totalBatchWithdrawals;
    
    // Gas optimization: Use uint256 for counters to avoid storage packing issues
    uint256 public totalParticipants;
    uint256 public totalWithdrawals;
    
    // Modifiers with gas optimizations
    modifier validDepositAmount() {
        require(msg.value >= MIN_DEPOSIT && msg.value <= MAX_DEPOSIT, "Invalid deposit amount");
        _;
    }
    
    modifier onlyActiveRound(uint256 roundId) {
        MixingRound storage round = mixingRounds[roundId];
        require(round.isActive && !round.isCompleted, "Round not active");
        _;
    }
    
    modifier onlyCompletedRound(uint256 roundId) {
        require(mixingRounds[roundId].isCompleted, "Round not completed");
        _;
    }
    
    modifier onlyUnusedNullifier(bytes32 nullifier) {
        require(!nullifiers[nullifier], "Nullifier already used");
        _;
    }
    
    constructor() {
        currentRoundId = 1;
        totalRounds = 0;
        totalMixedAmount = 0;
        totalBatchWithdrawals = 0;
        totalParticipants = 0;
        totalWithdrawals = 0;
    }
    
    /**
     * @dev Start a new mixing round with gas optimizations
     * @param minParticipants Minimum participants required
     * @param maxParticipants Maximum participants allowed
     */
    function startMixingRound(
        uint128 minParticipants,
        uint128 maxParticipants
    ) external onlyOwner whenNotPaused {
        require(minParticipants >= MIN_PARTICIPANTS, "Too few participants");
        require(maxParticipants <= MAX_PARTICIPANTS, "Too many participants");
        require(minParticipants <= maxParticipants, "Invalid participant range");
        
        uint256 deadline = block.timestamp + ROUND_TIMEOUT;
        
        // Gas optimization: Pack data into struct
        mixingRounds[currentRoundId] = MixingRound({
            roundId: uint128(currentRoundId),
            minParticipants: minParticipants,
            maxParticipants: maxParticipants,
            deadline: uint128(deadline),
            totalAmount: 0,
            participantCount: 0,
            isActive: true,
            isCompleted: false,
            batchSize: BATCH_SIZE,
            lastProcessedIndex: 0
        });
        
        totalRounds++;
        
        emit MixingRoundStarted(currentRoundId, minParticipants, maxParticipants, deadline, block.timestamp);
        
        currentRoundId++;
    }
    
    /**
     * @dev Join mixing round with gas optimizations
     * @param roundId Round ID to join
     */
    function joinMixingRound(uint256 roundId) 
        external 
        payable 
        validDepositAmount 
        onlyActiveRound(roundId)
        nonReentrant
    {
        MixingRound storage round = mixingRounds[roundId];
        require(round.participantCount < round.maxParticipants, "Round full");
        require(block.timestamp <= round.deadline, "Round expired");
        
        // Gas optimization: Check if participant already joined
        bool alreadyJoined = false;
        for (uint256 i = 0; i < round.participantCount; i++) {
            if (roundParticipants[roundId][i].participant == msg.sender) {
                alreadyJoined = true;
                break;
            }
        }
        require(!alreadyJoined, "Already joined");
        
        // Add participant with gas optimization
        roundParticipants[roundId][round.participantCount] = Participant({
            participant: msg.sender,
            amount: msg.value,
            hasWithdrawn: false,
            joinTimestamp: block.timestamp
        });
        
        round.participantCount++;
        round.totalAmount += msg.value;
        totalParticipants++;
        
        emit ParticipantJoined(roundId, msg.sender, msg.value, block.timestamp);
        
        // Auto-complete round if max participants reached
        if (round.participantCount >= round.maxParticipants) {
            _completeMixingRound(roundId);
        }
    }
    
    /**
     * @dev Complete mixing round with gas optimizations
     * @param roundId Round ID to complete
     */
    function completeMixingRound(uint256 roundId) 
        external 
        onlyActiveRound(roundId)
    {
        MixingRound storage round = mixingRounds[roundId];
        require(round.participantCount >= round.minParticipants, "Insufficient participants");
        require(block.timestamp > round.deadline, "Round not expired");
        
        _completeMixingRound(roundId);
    }
    
    /**
     * @dev Internal function to complete mixing round
     * @param roundId Round ID to complete
     */
    function _completeMixingRound(uint256 roundId) internal {
        MixingRound storage round = mixingRounds[roundId];
        round.isActive = false;
        round.isCompleted = true;
        totalMixedAmount += round.totalAmount;
        
        emit MixingRoundCompleted(roundId, round.totalAmount, round.participantCount, block.timestamp);
    }
    
    /**
     * @dev Process batch withdrawals for gas efficiency
     * @param roundId Round ID
     * @param startIndex Starting index for batch processing
     * @param batchSize Size of batch to process
     */
    function processBatchWithdrawals(
        uint256 roundId,
        uint256 startIndex,
        uint256 batchSize
    ) external onlyCompletedRound(roundId) nonReentrant {
        require(batchSize <= BATCH_SIZE, "Batch too large");
        require(startIndex + batchSize <= mixingRounds[roundId].participantCount, "Invalid batch range");
        
        MixingRound storage round = mixingRounds[roundId];
        require(block.timestamp >= round.deadline + WITHDRAWAL_DELAY, "Withdrawal delay not met");
        
        uint256 totalBatchAmount = 0;
        address[] memory recipients = new address[](batchSize);
        uint256[] memory amounts = new uint256[](batchSize);
        
        // Process batch with gas optimization
        for (uint256 i = 0; i < batchSize; i++) {
            uint256 index = startIndex + i;
            Participant storage participant = roundParticipants[roundId][index];
            
            if (!participant.hasWithdrawn) {
                participant.hasWithdrawn = true;
                recipients[i] = participant.participant;
                amounts[i] = participant.amount;
                totalBatchAmount += participant.amount;
                totalWithdrawals++;
                
                emit FundsWithdrawn(roundId, participant.participant, participant.amount, block.timestamp);
            }
        }
        
        // Create batch withdrawal record
        batchWithdrawals[totalBatchWithdrawals] = BatchWithdrawal({
            roundId: roundId,
            recipients: recipients,
            amounts: amounts,
            batchSize: batchSize,
            timestamp: block.timestamp,
            isProcessed: true
        });
        
        totalBatchWithdrawals++;
        
        emit BatchWithdrawalProcessed(roundId, batchSize, totalBatchAmount, block.timestamp);
    }
    
    /**
     * @dev Get mixing round information with gas optimization
     * @param roundId Round ID
     */
    function getMixingRound(uint256 roundId) external view returns (
        uint256 roundId_,
        uint256 minParticipants,
        uint256 maxParticipants,
        uint256 deadline,
        uint256 totalAmount,
        uint256 participantCount,
        bool isActive,
        bool isCompleted,
        uint256 batchSize,
        uint256 lastProcessedIndex
    ) {
        MixingRound storage round = mixingRounds[roundId];
        return (
            round.roundId,
            round.minParticipants,
            round.maxParticipants,
            round.deadline,
            round.totalAmount,
            round.participantCount,
            round.isActive,
            round.isCompleted,
            round.batchSize,
            round.lastProcessedIndex
        );
    }
    
    /**
     * @dev Get participant information with gas optimization
     * @param roundId Round ID
     * @param index Participant index
     */
    function getParticipant(uint256 roundId, uint256 index) external view returns (
        address participant,
        uint256 amount,
        bool hasWithdrawn,
        uint256 joinTimestamp
    ) {
        Participant storage p = roundParticipants[roundId][index];
        return (
            p.participant,
            p.amount,
            p.hasWithdrawn,
            p.joinTimestamp
        );
    }
    
    /**
     * @dev Get batch withdrawal information
     * @param batchId Batch withdrawal ID
     */
    function getBatchWithdrawal(uint256 batchId) external view returns (
        uint256 roundId,
        address[] memory recipients,
        uint256[] memory amounts,
        uint256 batchSize,
        uint256 timestamp,
        bool isProcessed
    ) {
        BatchWithdrawal storage batch = batchWithdrawals[batchId];
        return (
            batch.roundId,
            batch.recipients,
            batch.amounts,
            batch.batchSize,
            batch.timestamp,
            batch.isProcessed
        );
    }
    
    /**
     * @dev Get contract statistics with gas optimization
     */
    function getStatistics() external view returns (
        uint256 currentRoundId_,
        uint256 totalRounds_,
        uint256 totalMixedAmount_,
        uint256 totalBatchWithdrawals_,
        uint256 totalParticipants_,
        uint256 totalWithdrawals_
    ) {
        return (
            currentRoundId,
            totalRounds,
            totalMixedAmount,
            totalBatchWithdrawals,
            totalParticipants,
            totalWithdrawals
        );
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw function for stuck funds
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }
} 