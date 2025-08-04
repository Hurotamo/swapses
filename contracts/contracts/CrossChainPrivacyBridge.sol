// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title CrossChainPrivacyBridge
 * @dev Layer 3: Cross-Chain Privacy with atomic swaps, state channels, and HTLC
 */
contract CrossChainPrivacyBridge is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;
    
    // Events
    event AtomicSwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed recipient,
        uint256 amount,
        uint256 deadline,
        bytes32 secretHash
    );
    
    event AtomicSwapCompleted(
        bytes32 indexed swapId,
        address indexed recipient,
        bytes32 secret,
        uint256 amount
    );
    
    event AtomicSwapRefunded(
        bytes32 indexed swapId,
        address indexed initiator,
        uint256 amount
    );
    
    event StateChannelOpened(
        bytes32 indexed channelId,
        address indexed participant1,
        address indexed participant2,
        uint256 amount1,
        uint256 amount2
    );
    
    event StateChannelUpdated(
        bytes32 indexed channelId,
        uint256 newBalance1,
        uint256 newBalance2,
        uint256 nonce
    );
    
    event StateChannelClosed(
        bytes32 indexed channelId,
        address indexed closer,
        uint256 finalBalance1,
        uint256 finalBalance2
    );
    
    event HTLCCreated(
        bytes32 indexed htlcId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 timeout,
        bytes32 hashlock
    );
    
    event HTLCCompleted(
        bytes32 indexed htlcId,
        address indexed recipient,
        bytes32 secret,
        uint256 amount
    );
    
    event HTLCExpired(
        bytes32 indexed htlcId,
        address indexed sender,
        uint256 amount
    );
    
    // Structs
    struct AtomicSwap {
        bytes32 swapId;
        address initiator;
        address recipient;
        uint256 amount;
        uint256 deadline;
        bytes32 secretHash;
        bool isCompleted;
        bool isRefunded;
    }
    
    struct StateChannel {
        bytes32 channelId;
        address participant1;
        address participant2;
        uint256 balance1;
        uint256 balance2;
        uint256 nonce;
        bool isOpen;
        uint256 timeout;
    }
    
    struct HTLC {
        bytes32 htlcId;
        address sender;
        address recipient;
        uint256 amount;
        uint256 timeout;
        bytes32 hashlock;
        bool isCompleted;
        bool isExpired;
    }
    
    // State variables
    mapping(bytes32 => AtomicSwap) public atomicSwaps;
    mapping(bytes32 => StateChannel) public stateChannels;
    mapping(bytes32 => HTLC) public htlcContracts;
    mapping(bytes32 => bool) public usedSecrets;
    mapping(address => bytes32[]) public userSwaps;
    mapping(address => bytes32[]) public userChannels;
    mapping(address => bytes32[]) public userHTLCs;
    
    uint256 public constant MIN_SWAP_AMOUNT = 0.01 ether;
    uint256 public constant MAX_SWAP_AMOUNT = 1000000 ether;
    uint256 public constant MIN_TIMEOUT = 1 hours;
    uint256 public constant MAX_TIMEOUT = 7 days;
    uint256 public constant CHANNEL_TIMEOUT = 24 hours;
    
    uint256 public totalAtomicSwaps;
    uint256 public totalStateChannels;
    uint256 public totalHTLCs;
    uint256 public totalCompletedSwaps;
    uint256 public totalCompletedHTLCs;
    
    constructor() {
        totalAtomicSwaps = 0;
        totalStateChannels = 0;
        totalHTLCs = 0;
        totalCompletedSwaps = 0;
        totalCompletedHTLCs = 0;
    }
    
    // Modifiers
    modifier validSwapAmount() {
        require(msg.value >= MIN_SWAP_AMOUNT && msg.value <= MAX_SWAP_AMOUNT, "Invalid swap amount");
        _;
    }
    
    modifier validTimeout(uint256 timeout) {
        require(timeout >= MIN_TIMEOUT && timeout <= MAX_TIMEOUT, "Invalid timeout");
        _;
    }
    
    modifier onlyChannelParticipant(bytes32 channelId) {
        StateChannel storage channel = stateChannels[channelId];
        require(msg.sender == channel.participant1 || msg.sender == channel.participant2, "Not channel participant");
        _;
    }
    
    modifier onlyHTLCParticipant(bytes32 htlcId) {
        HTLC storage htlc = htlcContracts[htlcId];
        require(msg.sender == htlc.sender || msg.sender == htlc.recipient, "Not HTLC participant");
        _;
    }
    
    /**
     * @dev Initiate an atomic swap for cross-chain privacy
     * @param recipient Recipient address
     * @param secretHash Hash of the secret
     * @param timeout Swap timeout
     */
    function initiateAtomicSwap(
        address recipient,
        bytes32 secretHash,
        uint256 timeout
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        validSwapAmount
        validTimeout(timeout)
    {
        require(recipient != address(0), "Invalid recipient");
        require(secretHash != bytes32(0), "Invalid secret hash");
        require(recipient != msg.sender, "Cannot swap with self");
        
        bytes32 swapId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            msg.value,
            secretHash,
            block.timestamp
        ));
        
        require(atomicSwaps[swapId].swapId == bytes32(0), "Swap already exists");
        
        atomicSwaps[swapId] = AtomicSwap({
            swapId: swapId,
            initiator: msg.sender,
            recipient: recipient,
            amount: msg.value,
            deadline: block.timestamp + timeout,
            secretHash: secretHash,
            isCompleted: false,
            isRefunded: false
        });
        
        userSwaps[msg.sender].push(swapId);
        userSwaps[recipient].push(swapId);
        totalAtomicSwaps++;
        
        emit AtomicSwapInitiated(swapId, msg.sender, recipient, msg.value, block.timestamp + timeout, secretHash);
    }
    
    /**
     * @dev Complete an atomic swap with the secret
     * @param swapId Swap ID
     * @param secret The secret to complete the swap
     */
    function completeAtomicSwap(bytes32 swapId, bytes32 secret) 
        external 
        nonReentrant 
        whenNotPaused
    {
        AtomicSwap storage swap = atomicSwaps[swapId];
        require(swap.swapId != bytes32(0), "Swap not found");
        require(!swap.isCompleted, "Swap already completed");
        require(!swap.isRefunded, "Swap already refunded");
        require(block.timestamp <= swap.deadline, "Swap expired");
        require(msg.sender == swap.recipient, "Only recipient can complete");
        require(keccak256(abi.encodePacked(secret)) == swap.secretHash, "Invalid secret");
        require(!usedSecrets[secret], "Secret already used");
        
        swap.isCompleted = true;
        usedSecrets[secret] = true;
        totalCompletedSwaps++;
        
        (bool success, ) = msg.sender.call{value: swap.amount}("");
        require(success, "Transfer failed");
        
        emit AtomicSwapCompleted(swapId, msg.sender, secret, swap.amount);
    }
    
    /**
     * @dev Refund an atomic swap if expired
     * @param swapId Swap ID
     */
    function refundAtomicSwap(bytes32 swapId) 
        external 
        nonReentrant 
        whenNotPaused
    {
        AtomicSwap storage swap = atomicSwaps[swapId];
        require(swap.swapId != bytes32(0), "Swap not found");
        require(!swap.isCompleted, "Swap already completed");
        require(!swap.isRefunded, "Swap already refunded");
        require(block.timestamp > swap.deadline, "Swap not expired");
        require(msg.sender == swap.initiator, "Only initiator can refund");
        
        swap.isRefunded = true;
        
        (bool success, ) = msg.sender.call{value: swap.amount}("");
        require(success, "Transfer failed");
        
        emit AtomicSwapRefunded(swapId, msg.sender, swap.amount);
    }
    
    /**
     * @dev Open a cross-chain state channel
     * @param participant2 Second participant
     * @param amount2 Amount for second participant
     */
    function openStateChannel(
        address participant2,
        uint256 amount2
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        validSwapAmount
    {
        require(participant2 != address(0), "Invalid participant");
        require(participant2 != msg.sender, "Cannot open channel with self");
        require(msg.value >= amount2, "Insufficient funds for channel");
        
        bytes32 channelId = keccak256(abi.encodePacked(
            msg.sender,
            participant2,
            msg.value,
            amount2,
            block.timestamp
        ));
        
        require(stateChannels[channelId].channelId == bytes32(0), "Channel already exists");
        
        stateChannels[channelId] = StateChannel({
            channelId: channelId,
            participant1: msg.sender,
            participant2: participant2,
            balance1: msg.value - amount2,
            balance2: amount2,
            nonce: 0,
            isOpen: true,
            timeout: block.timestamp + CHANNEL_TIMEOUT
        });
        
        userChannels[msg.sender].push(channelId);
        userChannels[participant2].push(channelId);
        totalStateChannels++;
        
        emit StateChannelOpened(channelId, msg.sender, participant2, msg.value - amount2, amount2);
    }
    
    /**
     * @dev Update state channel balance
     * @param channelId Channel ID
     * @param newBalance1 New balance for participant 1
     * @param newBalance2 New balance for participant 2
     * @param signature Signature from other participant
     */
    function updateStateChannel(
        bytes32 channelId,
        uint256 newBalance1,
        uint256 newBalance2,
        bytes memory signature
    ) 
        external 
        nonReentrant 
        whenNotPaused
        onlyChannelParticipant(channelId)
    {
        StateChannel storage channel = stateChannels[channelId];
        require(channel.isOpen, "Channel not open");
        require(block.timestamp <= channel.timeout, "Channel expired");
        require(newBalance1 + newBalance2 == channel.balance1 + channel.balance2, "Invalid balance update");
        
        // Verify signature from other participant
        bytes32 messageHash = keccak256(abi.encodePacked(channelId, newBalance1, newBalance2, channel.nonce + 1));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        address otherParticipant = msg.sender == channel.participant1 ? channel.participant2 : channel.participant1;
        require(signer == otherParticipant, "Invalid signature");
        
        channel.balance1 = newBalance1;
        channel.balance2 = newBalance2;
        channel.nonce++;
        
        emit StateChannelUpdated(channelId, newBalance1, newBalance2, channel.nonce);
    }
    
    /**
     * @dev Close state channel
     * @param channelId Channel ID
     */
    function closeStateChannel(bytes32 channelId) 
        external 
        nonReentrant 
        whenNotPaused
        onlyChannelParticipant(channelId)
    {
        StateChannel storage channel = stateChannels[channelId];
        require(channel.isOpen, "Channel not open");
        require(block.timestamp > channel.timeout, "Channel not expired");
        
        channel.isOpen = false;
        
        // Distribute final balances
        if (channel.balance1 > 0) {
            (bool success1, ) = channel.participant1.call{value: channel.balance1}("");
            require(success1, "Transfer to participant1 failed");
        }
        
        if (channel.balance2 > 0) {
            (bool success2, ) = channel.participant2.call{value: channel.balance2}("");
            require(success2, "Transfer to participant2 failed");
        }
        
        emit StateChannelClosed(channelId, msg.sender, channel.balance1, channel.balance2);
    }
    
    /**
     * @dev Create HTLC for cross-chain privacy
     * @param recipient Recipient address
     * @param hashlock Hash of the secret
     * @param timeout HTLC timeout
     */
    function createHTLC(
        address recipient,
        bytes32 hashlock,
        uint256 timeout
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        validSwapAmount
        validTimeout(timeout)
    {
        require(recipient != address(0), "Invalid recipient");
        require(hashlock != bytes32(0), "Invalid hashlock");
        require(recipient != msg.sender, "Cannot create HTLC with self");
        
        bytes32 htlcId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            msg.value,
            hashlock,
            block.timestamp
        ));
        
        require(htlcContracts[htlcId].htlcId == bytes32(0), "HTLC already exists");
        
        htlcContracts[htlcId] = HTLC({
            htlcId: htlcId,
            sender: msg.sender,
            recipient: recipient,
            amount: msg.value,
            timeout: block.timestamp + timeout,
            hashlock: hashlock,
            isCompleted: false,
            isExpired: false
        });
        
        userHTLCs[msg.sender].push(htlcId);
        userHTLCs[recipient].push(htlcId);
        totalHTLCs++;
        
        emit HTLCCreated(htlcId, msg.sender, recipient, msg.value, block.timestamp + timeout, hashlock);
    }
    
    /**
     * @dev Complete HTLC with secret
     * @param htlcId HTLC ID
     * @param secret Secret to complete HTLC
     */
    function completeHTLC(bytes32 htlcId, bytes32 secret) 
        external 
        nonReentrant 
        whenNotPaused
    {
        HTLC storage htlc = htlcContracts[htlcId];
        require(htlc.htlcId != bytes32(0), "HTLC not found");
        require(!htlc.isCompleted, "HTLC already completed");
        require(!htlc.isExpired, "HTLC already expired");
        require(block.timestamp <= htlc.timeout, "HTLC expired");
        require(msg.sender == htlc.recipient, "Only recipient can complete");
        require(keccak256(abi.encodePacked(secret)) == htlc.hashlock, "Invalid secret");
        require(!usedSecrets[secret], "Secret already used");
        
        htlc.isCompleted = true;
        usedSecrets[secret] = true;
        totalCompletedHTLCs++;
        
        (bool success, ) = msg.sender.call{value: htlc.amount}("");
        require(success, "Transfer failed");
        
        emit HTLCCompleted(htlcId, msg.sender, secret, htlc.amount);
    }
    
    /**
     * @dev Expire HTLC if timeout reached
     * @param htlcId HTLC ID
     */
    function expireHTLC(bytes32 htlcId) 
        external 
        nonReentrant 
        whenNotPaused
    {
        HTLC storage htlc = htlcContracts[htlcId];
        require(htlc.htlcId != bytes32(0), "HTLC not found");
        require(!htlc.isCompleted, "HTLC already completed");
        require(!htlc.isExpired, "HTLC already expired");
        require(block.timestamp > htlc.timeout, "HTLC not expired");
        require(msg.sender == htlc.sender, "Only sender can expire");
        
        htlc.isExpired = true;
        
        (bool success, ) = msg.sender.call{value: htlc.amount}("");
        require(success, "Transfer failed");
        
        emit HTLCExpired(htlcId, msg.sender, htlc.amount);
    }
    
    /**
     * @dev Get atomic swap information
     * @param swapId Swap ID
     * @return swapId_ Swap ID
     * @return initiator Initiator address
     * @return recipient Recipient address
     * @return amount Swap amount
     * @return deadline Swap deadline
     * @return secretHash Secret hash
     * @return isCompleted Whether swap is completed
     * @return isRefunded Whether swap is refunded
     */
    function getAtomicSwap(bytes32 swapId) 
        external 
        view 
        returns (
            bytes32 swapId_,
            address initiator,
            address recipient,
            uint256 amount,
            uint256 deadline,
            bytes32 secretHash,
            bool isCompleted,
            bool isRefunded
        ) 
    {
        AtomicSwap memory swap = atomicSwaps[swapId];
        return (
            swap.swapId,
            swap.initiator,
            swap.recipient,
            swap.amount,
            swap.deadline,
            swap.secretHash,
            swap.isCompleted,
            swap.isRefunded
        );
    }
    
    /**
     * @dev Get state channel information
     * @param channelId Channel ID
     * @return channelId_ Channel ID
     * @return participant1 First participant
     * @return participant2 Second participant
     * @return balance1 Balance of participant 1
     * @return balance2 Balance of participant 2
     * @return nonce Channel nonce
     * @return isOpen Whether channel is open
     * @return timeout Channel timeout
     */
    function getStateChannel(bytes32 channelId) 
        external 
        view 
        returns (
            bytes32 channelId_,
            address participant1,
            address participant2,
            uint256 balance1,
            uint256 balance2,
            uint256 nonce,
            bool isOpen,
            uint256 timeout
        ) 
    {
        StateChannel memory channel = stateChannels[channelId];
        return (
            channel.channelId,
            channel.participant1,
            channel.participant2,
            channel.balance1,
            channel.balance2,
            channel.nonce,
            channel.isOpen,
            channel.timeout
        );
    }
    
    /**
     * @dev Get HTLC information
     * @param htlcId HTLC ID
     * @return htlcId_ HTLC ID
     * @return sender Sender address
     * @return recipient Recipient address
     * @return amount HTLC amount
     * @return timeout HTLC timeout
     * @return hashlock HTLC hashlock
     * @return isCompleted Whether HTLC is completed
     * @return isExpired Whether HTLC is expired
     */
    function getHTLC(bytes32 htlcId) 
        external 
        view 
        returns (
            bytes32 htlcId_,
            address sender,
            address recipient,
            uint256 amount,
            uint256 timeout,
            bytes32 hashlock,
            bool isCompleted,
            bool isExpired
        ) 
    {
        HTLC memory htlc = htlcContracts[htlcId];
        return (
            htlc.htlcId,
            htlc.sender,
            htlc.recipient,
            htlc.amount,
            htlc.timeout,
            htlc.hashlock,
            htlc.isCompleted,
            htlc.isExpired
        );
    }
    
    /**
     * @dev Get user's atomic swaps
     * @param user User address
     * @return Array of swap IDs
     */
    function getUserSwaps(address user) external view returns (bytes32[] memory) {
        return userSwaps[user];
    }
    
    /**
     * @dev Get user's state channels
     * @param user User address
     * @return Array of channel IDs
     */
    function getUserChannels(address user) external view returns (bytes32[] memory) {
        return userChannels[user];
    }
    
    /**
     * @dev Get user's HTLCs
     * @param user User address
     * @return Array of HTLC IDs
     */
    function getUserHTLCs(address user) external view returns (bytes32[] memory) {
        return userHTLCs[user];
    }
    
    /**
     * @dev Emergency pause
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Resume operations
     */
    function resume() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraw contract fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    /**
     * @dev Get contract statistics
     */
    function getStats() external view returns (
        uint256 totalAtomicSwaps_,
        uint256 totalStateChannels_,
        uint256 totalHTLCs_,
        uint256 totalCompletedSwaps_,
        uint256 totalCompletedHTLCs_
    ) {
        return (
            totalAtomicSwaps,
            totalStateChannels,
            totalHTLCs,
            totalCompletedSwaps,
            totalCompletedHTLCs
        );
    }
    
    // Receive function
    receive() external payable {
        // Allow receiving ETH
    }
} 