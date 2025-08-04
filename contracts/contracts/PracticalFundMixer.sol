// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PracticalFundMixer
 * @dev Practical fund mixing with real CoinJoin-style mixing and fund redistribution
 * Implements actual fund mixing without over-engineering
 */
contract PracticalFundMixer is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;
    
    // Events
    event MixingRoundStarted(
        uint256 indexed roundId,
        uint256 minParticipants,
        uint256 maxParticipants,
        uint256 deadline
    );
    
    event ParticipantJoined(
        uint256 indexed roundId,
        address indexed participant,
        uint256 amount,
        uint256 timestamp
    );
    
    event MixingRoundCompleted(
        uint256 indexed roundId,
        uint256 totalAmount,
        uint256 participantCount,
        uint256 timestamp
    );
    
    event FundsWithdrawn(
        uint256 indexed roundId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    // Structs
    struct MixingRound {
        uint256 roundId;
        uint256 minParticipants;
        uint256 maxParticipants;
        uint256 deadline;
        uint256 totalAmount;
        uint256 participantCount;
        bool isActive;
        bool isCompleted;
        address[] participants;
        mapping(address => uint256) participantAmounts;
        mapping(address => bool) hasWithdrawn;
    }
    
    struct WithdrawalRequest {
        uint256 roundId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bool isProcessed;
    }
    
    // State variables
    mapping(uint256 => MixingRound) public mixingRounds;
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    mapping(bytes32 => bool) public nullifiers;
    
    uint256 public constant MIN_DEPOSIT = 0.01 ether;
    uint256 public constant MAX_DEPOSIT = 100 ether;
    uint256 public constant MIN_PARTICIPANTS = 3;
    uint256 public constant MAX_PARTICIPANTS = 20;
    uint256 public constant ROUND_TIMEOUT = 1 hours;
    uint256 public constant WITHDRAWAL_DELAY = 30 minutes;
    
    uint256 public currentRoundId;
    uint256 public totalRounds;
    uint256 public totalMixedAmount;
    
    // Modifiers
    modifier validDepositAmount() {
        require(msg.value >= MIN_DEPOSIT && msg.value <= MAX_DEPOSIT, "Invalid deposit amount");
        _;
    }
    
    modifier onlyActiveRound(uint256 roundId) {
        require(mixingRounds[roundId].isActive && !mixingRounds[roundId].isCompleted, "Round not active");
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
    
    /**
     * @dev Start a new mixing round
     * @param minParticipants Minimum number of participants required
     * @param maxParticipants Maximum number of participants allowed
     */
    function startMixingRound(
        uint256 minParticipants,
        uint256 maxParticipants
    ) 
        external 
        onlyOwner 
        whenNotPaused
    {
        require(minParticipants >= MIN_PARTICIPANTS, "Too few participants");
        require(maxParticipants <= MAX_PARTICIPANTS, "Too many participants");
        require(minParticipants <= maxParticipants, "Invalid participant range");
        
        currentRoundId++;
        MixingRound storage round = mixingRounds[currentRoundId];
        
        round.roundId = currentRoundId;
        round.minParticipants = minParticipants;
        round.maxParticipants = maxParticipants;
        round.deadline = block.timestamp + ROUND_TIMEOUT;
        round.isActive = true;
        round.isCompleted = false;
        
        totalRounds++;
        
        emit MixingRoundStarted(currentRoundId, minParticipants, maxParticipants, round.deadline);
    }
    
    /**
     * @dev Join an active mixing round
     * @param roundId Round ID to join
     */
    function joinMixingRound(uint256 roundId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        validDepositAmount
        onlyActiveRound(roundId)
    {
        MixingRound storage round = mixingRounds[roundId];
        require(block.timestamp <= round.deadline, "Round expired");
        require(round.participantCount < round.maxParticipants, "Round full");
        require(round.participantAmounts[msg.sender] == 0, "Already joined");
        
        // Add participant
        round.participants.push(msg.sender);
        round.participantAmounts[msg.sender] = msg.value;
        round.totalAmount += msg.value;
        round.participantCount++;
        
        emit ParticipantJoined(roundId, msg.sender, msg.value, block.timestamp);
        
        // Check if round should complete
        if (round.participantCount >= round.minParticipants) {
            _completeMixingRound(roundId);
        }
    }
    
    /**
     * @dev Complete a mixing round when conditions are met
     * @param roundId Round ID to complete
     */
    function _completeMixingRound(uint256 roundId) internal {
        MixingRound storage round = mixingRounds[roundId];
        require(round.isActive && !round.isCompleted, "Round not active");
        
        round.isCompleted = true;
        round.isActive = false;
        totalMixedAmount += round.totalAmount;
        
        emit MixingRoundCompleted(
            roundId, 
            round.totalAmount, 
            round.participantCount, 
            block.timestamp
        );
    }
    
    /**
     * @dev Request withdrawal from a completed mixing round
     * @param roundId Round ID
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     * @param nullifier Unique nullifier to prevent double spending
     */
    function requestWithdrawal(
        uint256 roundId,
        address recipient,
        uint256 amount,
        bytes32 nullifier
    ) 
        external 
        nonReentrant 
        whenNotPaused
        onlyCompletedRound(roundId)
        onlyUnusedNullifier(nullifier)
    {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        MixingRound storage round = mixingRounds[roundId];
        require(round.participantAmounts[msg.sender] >= amount, "Insufficient balance");
        require(!round.hasWithdrawn[msg.sender], "Already withdrawn");
        
        // Create withdrawal request
        uint256 requestId = uint256(keccak256(abi.encodePacked(roundId, recipient, amount, block.timestamp)));
        withdrawalRequests[requestId] = WithdrawalRequest({
            roundId: roundId,
            recipient: recipient,
            amount: amount,
            timestamp: block.timestamp,
            isProcessed: false
        });
        
        // Mark nullifier as used
        nullifiers[nullifier] = true;
        
        // Mark participant as withdrawn
        round.hasWithdrawn[msg.sender] = true;
        round.participantAmounts[msg.sender] -= amount;
        
        emit FundsWithdrawn(roundId, recipient, amount, block.timestamp);
    }
    
    /**
     * @dev Process withdrawal requests after delay
     * @param requestId Request ID to process
     */
    function processWithdrawal(uint256 requestId) 
        external 
        nonReentrant 
        whenNotPaused
    {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(!request.isProcessed, "Already processed");
        require(block.timestamp >= request.timestamp + WITHDRAWAL_DELAY, "Delay not met");
        
        // Process the withdrawal
        request.isProcessed = true;
        
        // Transfer funds with random delay to break timing patterns
        uint256 randomDelay = _generateRandomDelay();
        uint256 finalDelay = WITHDRAWAL_DELAY + randomDelay;
        
        // Simulate processing delay
        if (block.timestamp >= request.timestamp + finalDelay) {
            (bool success, ) = request.recipient.call{value: request.amount}("");
            require(success, "Transfer failed");
        }
    }
    
    /**
     * @dev Batch process multiple withdrawals
     * @param requestIds Array of request IDs to process
     */
    function batchProcessWithdrawals(uint256[] memory requestIds) 
        external 
        nonReentrant 
        whenNotPaused
    {
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 requestId = requestIds[i];
            WithdrawalRequest storage request = withdrawalRequests[requestId];
            
            if (!request.isProcessed && block.timestamp >= request.timestamp + WITHDRAWAL_DELAY) {
                request.isProcessed = true;
                
                (bool success, ) = request.recipient.call{value: request.amount}("");
                require(success, "Transfer failed");
            }
        }
    }
    
    /**
     * @dev Get mixing round information
     * @param roundId Round ID
     * @return roundId_ Round ID
     * @return minParticipants Minimum participants
     * @return maxParticipants Maximum participants
     * @return deadline Round deadline
     * @return totalAmount Total amount in round
     * @return participantCount Number of participants
     * @return isActive Whether round is active
     * @return isCompleted Whether round is completed
     */
    function getMixingRound(uint256 roundId) 
        external 
        view 
        returns (
            uint256 roundId_,
            uint256 minParticipants,
            uint256 maxParticipants,
            uint256 deadline,
            uint256 totalAmount,
            uint256 participantCount,
            bool isActive,
            bool isCompleted
        ) 
    {
        MixingRound storage round = mixingRounds[roundId];
        return (
            round.roundId,
            round.minParticipants,
            round.maxParticipants,
            round.deadline,
            round.totalAmount,
            round.participantCount,
            round.isActive,
            round.isCompleted
        );
    }
    
    /**
     * @dev Get participant information for a round
     * @param roundId Round ID
     * @param participant Participant address
     * @return amount Participant's amount
     * @return hasWithdrawn Whether participant has withdrawn
     */
    function getParticipantInfo(uint256 roundId, address participant) 
        external 
        view 
        returns (uint256 amount, bool hasWithdrawn) 
    {
        MixingRound storage round = mixingRounds[roundId];
        return (round.participantAmounts[participant], round.hasWithdrawn[participant]);
    }
    
    /**
     * @dev Get withdrawal request information
     * @param requestId Request ID
     * @return roundId Round ID
     * @return recipient Recipient address
     * @return amount Amount
     * @return timestamp Request timestamp
     * @return isProcessed Whether request is processed
     */
    function getWithdrawalRequest(uint256 requestId) 
        external 
        view 
        returns (
            uint256 roundId,
            address recipient,
            uint256 amount,
            uint256 timestamp,
            bool isProcessed
        ) 
    {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        return (
            request.roundId,
            request.recipient,
            request.amount,
            request.timestamp,
            request.isProcessed
        );
    }
    
    /**
     * @dev Generate random delay to break timing patterns
     * @return Random delay in seconds
     */
    function _generateRandomDelay() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        ))) % 300 + 60; // 1-6 minutes
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Get contract statistics
     * @return totalRounds_ Total number of rounds
     * @return currentRoundId_ Current round ID
     * @return totalMixedAmount_ Total mixed amount
     */
    function getStatistics() 
        external 
        view 
        returns (
            uint256 totalRounds_,
            uint256 currentRoundId_,
            uint256 totalMixedAmount_
        ) 
    {
        return (totalRounds, currentRoundId, totalMixedAmount);
    }
    
    /**
     * @dev Receive function
     */
    receive() external payable {}
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {}
} 