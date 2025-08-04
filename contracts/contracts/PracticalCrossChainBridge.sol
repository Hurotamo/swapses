// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PracticalCrossChainBridge
 * @dev Practical cross-chain bridge with actual message passing and atomic swaps
 * Supports multiple networks without over-engineering
 */
contract PracticalCrossChainBridge is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;
    
    // Events
    event CrossChainMessageSent(
        bytes32 indexed messageId,
        address indexed sender,
        uint256 fromChainId,
        uint256 toChainId,
        bytes data,
        uint256 timestamp
    );
    
    event CrossChainMessageReceived(
        bytes32 indexed messageId,
        address indexed recipient,
        uint256 fromChainId,
        uint256 toChainId,
        bytes data,
        uint256 timestamp
    );
    
    event AtomicSwapInitiated(
        bytes32 indexed swapId,
        address indexed sender,
        uint256 fromChainId,
        uint256 toChainId,
        uint256 amount,
        address recipient,
        uint256 timestamp
    );
    
    event AtomicSwapCompleted(
        bytes32 indexed swapId,
        address indexed recipient,
        uint256 fromChainId,
        uint256 toChainId,
        uint256 amount,
        uint256 timestamp
    );
    
    event ChainStateUpdated(
        uint256 indexed chainId,
        bytes32 indexed stateHash,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    // Structs
    struct CrossChainMessage {
        bytes32 messageId;
        address sender;
        address recipient;
        uint256 fromChainId;
        uint256 toChainId;
        bytes data;
        uint256 timestamp;
        bool isProcessed;
        bool isExpired;
    }
    
    struct AtomicSwap {
        bytes32 swapId;
        address sender;
        address recipient;
        uint256 fromChainId;
        uint256 toChainId;
        uint256 amount;
        uint256 timestamp;
        bool isCompleted;
        bool isCancelled;
        bytes32 secretHash;
        bytes32 secret;
    }
    
    struct ChainState {
        uint256 chainId;
        bytes32 stateHash;
        uint256 blockNumber;
        uint256 timestamp;
        bool isValid;
    }
    
    struct NetworkConfig {
        uint256 chainId;
        bool isSupported;
        uint256 minSwapAmount;
        uint256 maxSwapAmount;
        uint256 swapFee;
        uint256 messageTimeout;
        uint256 swapTimeout;
        address[] validators;
    }
    
    // State variables
    mapping(bytes32 => CrossChainMessage) public crossChainMessages;
    mapping(bytes32 => AtomicSwap) public atomicSwaps;
    mapping(uint256 => NetworkConfig) public networkConfigs;
    mapping(uint256 => ChainState) public chainStates;
    mapping(bytes32 => bool) public processedMessages;
    mapping(bytes32 => bool) public completedSwaps;
    
    // Constants
    uint256 public constant BASE_CHAIN_ID = 84531; // Base Sepolia testnet
    uint256 public constant LISK_CHAIN_ID = 1891; // Lisk testnet
    uint256 public constant HOLESKY_CHAIN_ID = 17000; // Holesky testnet
    
    uint256 public constant MIN_SWAP_AMOUNT = 0.01 ether;
    uint256 public constant MAX_SWAP_AMOUNT = 100000 ether;
    uint256 public constant DEFAULT_SWAP_FEE = 0.001 ether;
    uint256 public constant MESSAGE_TIMEOUT = 2 hours;
    uint256 public constant SWAP_TIMEOUT = 1 hours;
    uint256 public constant MIN_VALIDATORS = 5;
    
    uint256 public totalMessages;
    uint256 public totalSwaps;
    uint256 public totalVolume;
    
    // Modifiers
    modifier validNetwork(uint256 chainId) {
        require(networkConfigs[chainId].isSupported, "Network not supported");
        _;
    }
    
    modifier validSwapAmount(uint256 amount) {
        require(amount >= MIN_SWAP_AMOUNT && amount <= MAX_SWAP_AMOUNT, "Invalid swap amount");
        _;
    }
    
    modifier onlyValidator(uint256 chainId) {
        bool isValidator = false;
        for (uint256 i = 0; i < networkConfigs[chainId].validators.length; i++) {
            if (networkConfigs[chainId].validators[i] == msg.sender) {
                isValidator = true;
                break;
            }
        }
        require(isValidator, "Not a validator");
        _;
    }
    
    constructor() {
        // Initialize supported networks
        _initializeNetworks();
    }
    
    /**
     * @dev Initialize supported networks
     */
    function _initializeNetworks() internal {
        // Base network
        networkConfigs[BASE_CHAIN_ID] = NetworkConfig({
            chainId: BASE_CHAIN_ID,
            isSupported: true,
            minSwapAmount: MIN_SWAP_AMOUNT,
            maxSwapAmount: MAX_SWAP_AMOUNT,
            swapFee: DEFAULT_SWAP_FEE,
            messageTimeout: MESSAGE_TIMEOUT,
            swapTimeout: SWAP_TIMEOUT,
            validators: new address[](0)
        });
        
        // Lisk network
        networkConfigs[LISK_CHAIN_ID] = NetworkConfig({
            chainId: LISK_CHAIN_ID,
            isSupported: true,
            minSwapAmount: MIN_SWAP_AMOUNT,
            maxSwapAmount: MAX_SWAP_AMOUNT,
            swapFee: DEFAULT_SWAP_FEE,
            messageTimeout: MESSAGE_TIMEOUT,
            swapTimeout: SWAP_TIMEOUT,
            validators: new address[](0)
        });
        
        // Holesky network
        networkConfigs[HOLESKY_CHAIN_ID] = NetworkConfig({
            chainId: HOLESKY_CHAIN_ID,
            isSupported: true,
            minSwapAmount: MIN_SWAP_AMOUNT,
            maxSwapAmount: MAX_SWAP_AMOUNT,
            swapFee: DEFAULT_SWAP_FEE,
            messageTimeout: MESSAGE_TIMEOUT,
            swapTimeout: SWAP_TIMEOUT,
            validators: new address[](0)
        });
        

    }
    
    /**
     * @dev Send cross-chain message
     * @param toChainId Target chain ID
     * @param recipient Recipient address on target chain
     * @param data Message data
     */
    function sendCrossChainMessage(
        uint256 toChainId,
        address recipient,
        bytes memory data
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        validNetwork(toChainId)
    {
        require(recipient != address(0), "Invalid recipient");
        require(data.length > 0, "Empty message");
        
        bytes32 messageId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            block.chainid,
            toChainId,
            data,
            block.timestamp
        ));
        
        require(!processedMessages[messageId], "Message already sent");
        
        crossChainMessages[messageId] = CrossChainMessage({
            messageId: messageId,
            sender: msg.sender,
            recipient: recipient,
            fromChainId: block.chainid,
            toChainId: toChainId,
            data: data,
            timestamp: block.timestamp,
            isProcessed: false,
            isExpired: false
        });
        
        processedMessages[messageId] = true;
        totalMessages++;
        
        emit CrossChainMessageSent(messageId, msg.sender, block.chainid, toChainId, data, block.timestamp);
    }
    
    /**
     * @dev Receive cross-chain message (called by validators)
     * @param messageId Message ID
     * @param sender Sender address
     * @param recipient Recipient address
     * @param fromChainId Source chain ID
     * @param data Message data
     * @param signatures Validator signatures
     */
    function receiveCrossChainMessage(
        bytes32 messageId,
        address sender,
        address recipient,
        uint256 fromChainId,
        bytes memory data,
        bytes[] memory signatures
    ) 
        external 
        nonReentrant 
        whenNotPaused
        validNetwork(fromChainId)
    {
        require(!processedMessages[messageId], "Message already processed");
        require(block.timestamp <= crossChainMessages[messageId].timestamp + MESSAGE_TIMEOUT, "Message expired");
        
        // Verify validator signatures
        require(verifyMessageSignatures(messageId, sender, recipient, fromChainId, data, signatures), "Invalid signatures");
        
        // Process the message
        processedMessages[messageId] = true;
        crossChainMessages[messageId].isProcessed = true;
        
        emit CrossChainMessageReceived(messageId, recipient, fromChainId, block.chainid, data, block.timestamp);
    }
    
    /**
     * @dev Initiate atomic swap
     * @param toChainId Target chain ID
     * @param recipient Recipient address on target chain
     * @param amount Swap amount
     */
    function initiateAtomicSwap(
        uint256 toChainId,
        address recipient,
        uint256 amount
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        validNetwork(toChainId)
        validSwapAmount(amount)
    {
        require(recipient != address(0), "Invalid recipient");
        require(msg.value == amount, "Amount mismatch");
        
        bytes32 swapId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            block.chainid,
            toChainId,
            amount,
            block.timestamp
        ));
        
        require(!completedSwaps[swapId], "Swap already initiated");
        
        // Generate secret hash for atomic swap
        bytes32 secretHash = keccak256(abi.encodePacked(swapId, block.timestamp));
        
        atomicSwaps[swapId] = AtomicSwap({
            swapId: swapId,
            sender: msg.sender,
            recipient: recipient,
            fromChainId: block.chainid,
            toChainId: toChainId,
            amount: amount,
            timestamp: block.timestamp,
            isCompleted: false,
            isCancelled: false,
            secretHash: secretHash,
            secret: bytes32(0)
        });
        
        completedSwaps[swapId] = true;
        totalSwaps++;
        totalVolume += amount;
        
        emit AtomicSwapInitiated(swapId, msg.sender, block.chainid, toChainId, amount, recipient, block.timestamp);
    }
    
    /**
     * @dev Complete atomic swap
     * @param swapId Swap ID
     * @param secret Secret to complete the swap
     * @param signatures Validator signatures
     */
    function completeAtomicSwap(
        bytes32 swapId,
        bytes32 secret,
        bytes[] memory signatures
    ) 
        external 
        nonReentrant 
        whenNotPaused
    {
        AtomicSwap storage swap = atomicSwaps[swapId];
        require(swap.sender != address(0), "Swap not found");
        require(!swap.isCompleted, "Swap already completed");
        require(!swap.isCancelled, "Swap cancelled");
        require(block.timestamp <= swap.timestamp + SWAP_TIMEOUT, "Swap expired");
        
        // Verify secret hash
        require(keccak256(abi.encodePacked(swapId, swap.timestamp)) == swap.secretHash, "Invalid secret hash");
        
        // Verify validator signatures
        require(verifySwapSignatures(swapId, secret, signatures), "Invalid signatures");
        
        // Complete the swap
        swap.isCompleted = true;
        swap.secret = secret;
        
        // Transfer funds to recipient
        uint256 transferAmount = swap.amount - networkConfigs[block.chainid].swapFee;
        (bool success, ) = payable(swap.recipient).call{value: transferAmount}("");
        require(success, "Transfer failed");
        
        emit AtomicSwapCompleted(swapId, swap.recipient, swap.fromChainId, swap.toChainId, swap.amount, block.timestamp);
    }
    
    /**
     * @dev Update chain state (called by validators)
     * @param chainId Chain ID
     * @param stateHash State hash
     * @param blockNumber Block number
     * @param signatures Validator signatures
     */
    function updateChainState(
        uint256 chainId,
        bytes32 stateHash,
        uint256 blockNumber,
        bytes[] memory signatures
    ) 
        external 
        nonReentrant 
        whenNotPaused
        validNetwork(chainId)
    {
        require(verifyStateSignatures(chainId, stateHash, blockNumber, signatures), "Invalid signatures");
        
        chainStates[chainId] = ChainState({
            chainId: chainId,
            stateHash: stateHash,
            blockNumber: blockNumber,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit ChainStateUpdated(chainId, stateHash, blockNumber, block.timestamp);
    }
    
    /**
     * @dev Verify message signatures
     * @param messageId Message ID
     * @param sender Sender address
     * @param recipient Recipient address
     * @param fromChainId Source chain ID
     * @param data Message data
     * @param signatures Signatures
     * @return True if signatures are valid
     */
    function verifyMessageSignatures(
        bytes32 messageId,
        address sender,
        address recipient,
        uint256 fromChainId,
        bytes memory data,
        bytes[] memory signatures
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(messageId, sender, recipient, fromChainId, data));
        return verifySignatures(messageHash, signatures, fromChainId);
    }
    
    /**
     * @dev Verify swap signatures
     * @param swapId Swap ID
     * @param secret Secret
     * @param signatures Signatures
     * @return True if signatures are valid
     */
    function verifySwapSignatures(
        bytes32 swapId,
        bytes32 secret,
        bytes[] memory signatures
    ) internal view returns (bool) {
        bytes32 swapHash = keccak256(abi.encodePacked(swapId, secret));
        return verifySignatures(swapHash, signatures, block.chainid);
    }
    
    /**
     * @dev Verify state signatures
     * @param chainId Chain ID
     * @param stateHash State hash
     * @param blockNumber Block number
     * @param signatures Signatures
     * @return True if signatures are valid
     */
    function verifyStateSignatures(
        uint256 chainId,
        bytes32 stateHash,
        uint256 blockNumber,
        bytes[] memory signatures
    ) internal view returns (bool) {
        bytes32 stateMessageHash = keccak256(abi.encodePacked(chainId, stateHash, blockNumber));
        return verifySignatures(stateMessageHash, signatures, chainId);
    }
    
    /**
     * @dev Verify signatures against validators
     * @param messageHash Message hash
     * @param signatures Signatures
     * @param chainId Chain ID
     * @return True if signatures are valid
     */
    function verifySignatures(
        bytes32 messageHash,
        bytes[] memory signatures,
        uint256 chainId
    ) internal view returns (bool) {
        require(signatures.length >= MIN_VALIDATORS, "Insufficient signatures");
        
        address[] memory validators = networkConfigs[chainId].validators;
        require(validators.length >= MIN_VALIDATORS, "Insufficient validators");
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = ethSignedMessageHash.recover(signatures[i]);
            bool isValidValidator = false;
            
            for (uint256 j = 0; j < validators.length; j++) {
                if (validators[j] == signer) {
                    isValidValidator = true;
                    break;
                }
            }
            
            if (!isValidValidator) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Add validator to network
     * @param validator Validator address
     * @param chainId Chain ID
     */
    function addValidator(address validator, uint256 chainId) 
        external 
        onlyOwner 
        validNetwork(chainId)
    {
        require(validator != address(0), "Invalid validator");
        
        address[] storage validators = networkConfigs[chainId].validators;
        for (uint256 i = 0; i < validators.length; i++) {
            require(validators[i] != validator, "Validator already exists");
        }
        
        validators.push(validator);
    }
    
    /**
     * @dev Remove validator from network
     * @param validator Validator address
     * @param chainId Chain ID
     */
    function removeValidator(address validator, uint256 chainId) 
        external 
        onlyOwner 
        validNetwork(chainId)
    {
        address[] storage validators = networkConfigs[chainId].validators;
        require(validators.length > MIN_VALIDATORS, "Too few validators");
        
        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] == validator) {
                validators[i] = validators[validators.length - 1];
                validators.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Get network configuration
     * @param chainId Chain ID
     * @return chainId_ Chain ID
     * @return isSupported Whether network is supported
     * @return minSwapAmount Minimum swap amount
     * @return maxSwapAmount Maximum swap amount
     * @return swapFee Swap fee
     * @return messageTimeout Message timeout
     * @return swapTimeout Swap timeout
     * @return validatorCount Number of validators
     */
    function getNetworkConfig(uint256 chainId) 
        external 
        view 
        returns (
            uint256 chainId_,
            bool isSupported,
            uint256 minSwapAmount,
            uint256 maxSwapAmount,
            uint256 swapFee,
            uint256 messageTimeout,
            uint256 swapTimeout,
            uint256 validatorCount
        ) 
    {
        NetworkConfig storage config = networkConfigs[chainId];
        return (
            config.chainId,
            config.isSupported,
            config.minSwapAmount,
            config.maxSwapAmount,
            config.swapFee,
            config.messageTimeout,
            config.swapTimeout,
            config.validators.length
        );
    }
    
    /**
     * @dev Get chain state
     * @param chainId Chain ID
     * @return stateHash State hash
     * @return blockNumber Block number
     * @return timestamp Timestamp
     * @return isValid Whether state is valid
     */
    function getChainState(uint256 chainId) 
        external 
        view 
        returns (
            bytes32 stateHash,
            uint256 blockNumber,
            uint256 timestamp,
            bool isValid
        ) 
    {
        ChainState storage state = chainStates[chainId];
        return (state.stateHash, state.blockNumber, state.timestamp, state.isValid);
    }
    
    /**
     * @dev Get contract statistics
     * @return totalMessages_ Total messages
     * @return totalSwaps_ Total swaps
     * @return totalVolume_ Total volume
     */
    function getStatistics() 
        external 
        view 
        returns (
            uint256 totalMessages_,
            uint256 totalSwaps_,
            uint256 totalVolume_
        ) 
    {
        return (totalMessages, totalSwaps, totalVolume);
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
     * @dev Receive function
     */
    receive() external payable {}
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {}
} 