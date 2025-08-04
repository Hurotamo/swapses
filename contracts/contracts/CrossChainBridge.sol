// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title CrossChainBridge
 * @dev Cross-chain bridge for automatic fund swapping between Lisk and Base
 * Enhances privacy by breaking transaction links across chains
 */
contract CrossChainBridge is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;
    
    // Events
    event CrossChainSwapInitiated(
        bytes32 indexed swapId,
        address indexed sender,
        uint256 fromChainId,
        uint256 toChainId,
        uint256 amount,
        uint256 timestamp
    );
    
    event CrossChainSwapCompleted(
        bytes32 indexed swapId,
        address indexed recipient,
        uint256 fromChainId,
        uint256 toChainId,
        uint256 amount,
        uint256 timestamp
    );
    
    event CrossChainSwapFailed(
        bytes32 indexed swapId,
        string reason,
        uint256 timestamp
    );
    
    event ValidatorAdded(
        address indexed validator,
        uint256 chainId,
        uint256 timestamp
    );
    
    event ValidatorRemoved(
        address indexed validator,
        uint256 chainId,
        uint256 timestamp
    );
    
    // Structs
    struct SwapRequest {
        address sender;
        address recipient;
        uint256 fromChainId;
        uint256 toChainId;
        uint256 amount;
        uint256 timestamp;
        bool isCompleted;
        bool isCancelled;
        bytes32 swapId;
    }
    
    struct ChainConfig {
        uint256 chainId;
        bool isSupported;
        uint256 minSwapAmount;
        uint256 maxSwapAmount;
        uint256 swapFee;
        uint256 validatorCount;
    }
    
    // State variables
    mapping(bytes32 => SwapRequest) public swapRequests;
    mapping(uint256 => ChainConfig) public chainConfigs;
    mapping(uint256 => mapping(address => bool)) public validators;
    mapping(address => bytes32[]) public userSwaps;
    
    // Constants
    uint256 public constant LISK_CHAIN_ID = 1891; // Lisk mainnet
    uint256 public constant BASE_CHAIN_ID = 8453; // Base mainnet
    uint256 public constant MIN_VALIDATORS = 3;
    uint256 public constant SWAP_TIMEOUT = 1 hours;
    
    // Fees and limits
    uint256 public constant DEFAULT_SWAP_FEE = 0.001 ether; // 0.1%
    uint256 public constant MIN_SWAP_AMOUNT = 0.01 ether;
    uint256 public constant MAX_SWAP_AMOUNT = 100 ether;
    
    // Modifiers
    modifier validChain(uint256 chainId) {
        require(chainConfigs[chainId].isSupported, "Chain not supported");
        _;
    }
    
    modifier validSwapAmount(uint256 amount) {
        require(amount >= MIN_SWAP_AMOUNT && amount <= MAX_SWAP_AMOUNT, "Invalid swap amount");
        _;
    }
    
    modifier onlyValidator(uint256 chainId) {
        require(validators[chainId][msg.sender], "Not a validator");
        _;
    }
    
    modifier swapExists(bytes32 swapId) {
        require(swapRequests[swapId].swapId != bytes32(0), "Swap does not exist");
        _;
    }
    
    modifier swapNotCompleted(bytes32 swapId) {
        require(!swapRequests[swapId].isCompleted, "Swap already completed");
        require(!swapRequests[swapId].isCancelled, "Swap cancelled");
        _;
    }
    
    constructor() {
        // Initialize supported chains
        chainConfigs[LISK_CHAIN_ID] = ChainConfig({
            chainId: LISK_CHAIN_ID,
            isSupported: true,
            minSwapAmount: MIN_SWAP_AMOUNT,
            maxSwapAmount: MAX_SWAP_AMOUNT,
            swapFee: DEFAULT_SWAP_FEE,
            validatorCount: 0
        });
        
        chainConfigs[BASE_CHAIN_ID] = ChainConfig({
            chainId: BASE_CHAIN_ID,
            isSupported: true,
            minSwapAmount: MIN_SWAP_AMOUNT,
            maxSwapAmount: MAX_SWAP_AMOUNT,
            swapFee: DEFAULT_SWAP_FEE,
            validatorCount: 0
        });
    }
    
    /**
     * @dev Initiate cross-chain swap
     * @param recipient Recipient address on target chain
     * @param toChainId Target chain ID
     * @param amount Amount to swap
     */
    function initiateSwap(
        address recipient,
        uint256 toChainId,
        uint256 amount
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        validChain(toChainId)
        validSwapAmount(amount)
    {
        require(msg.value == amount, "Incorrect amount sent");
        require(recipient != address(0), "Invalid recipient");
        require(toChainId != block.chainid, "Cannot swap to same chain");
        
        bytes32 swapId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            block.chainid,
            toChainId,
            amount,
            block.timestamp
        ));
        
        // Create swap request
        swapRequests[swapId] = SwapRequest({
            sender: msg.sender,
            recipient: recipient,
            fromChainId: block.chainid,
            toChainId: toChainId,
            amount: amount,
            timestamp: block.timestamp,
            isCompleted: false,
            isCancelled: false,
            swapId: swapId
        });
        
        userSwaps[msg.sender].push(swapId);
        
        emit CrossChainSwapInitiated(swapId, msg.sender, block.chainid, toChainId, amount, block.timestamp);
    }
    
    /**
     * @dev Complete cross-chain swap (called by validators)
     * @param swapId Swap ID
     * @param recipient Recipient address
     * @param amount Amount to transfer
     * @param signatures Array of validator signatures
     */
    function completeSwap(
        bytes32 swapId,
        address recipient,
        uint256 amount,
        bytes[] memory signatures
    ) 
        external 
        nonReentrant 
        whenNotPaused
        swapExists(swapId)
        swapNotCompleted(swapId)
    {
        SwapRequest memory swap = swapRequests[swapId];
        
        require(swap.recipient == recipient, "Invalid recipient");
        require(swap.amount == amount, "Invalid amount");
        require(block.timestamp <= swap.timestamp + SWAP_TIMEOUT, "Swap expired");
        
        // Verify validator signatures
        require(verifyValidatorSignatures(swapId, recipient, amount, signatures), "Invalid signatures");
        
        // Mark swap as completed
        swapRequests[swapId].isCompleted = true;
        
        // Transfer funds to recipient
        uint256 transferAmount = amount - chainConfigs[block.chainid].swapFee;
        (bool success, ) = payable(recipient).call{value: transferAmount}("");
        require(success, "Transfer failed");
        
        emit CrossChainSwapCompleted(swapId, recipient, swap.fromChainId, swap.toChainId, amount, block.timestamp);
    }
    
    /**
     * @dev Cancel swap (only sender can cancel)
     * @param swapId Swap ID
     */
    function cancelSwap(bytes32 swapId) 
        external 
        nonReentrant 
        whenNotPaused
        swapExists(swapId)
        swapNotCompleted(swapId)
    {
        SwapRequest memory swap = swapRequests[swapId];
        require(swap.sender == msg.sender, "Not swap sender");
        require(block.timestamp > swap.timestamp + SWAP_TIMEOUT, "Swap not expired");
        
        // Mark swap as cancelled
        swapRequests[swapId].isCancelled = true;
        
        // Refund sender
        (bool success, ) = payable(msg.sender).call{value: swap.amount}("");
        require(success, "Refund failed");
        
        emit CrossChainSwapFailed(swapId, "Cancelled by sender", block.timestamp);
    }
    
    /**
     * @dev Add validator for a chain
     * @param validator Validator address
     * @param chainId Chain ID
     */
    function addValidator(address validator, uint256 chainId) 
        external 
        onlyOwner 
        validChain(chainId)
    {
        require(validator != address(0), "Invalid validator");
        require(!validators[chainId][validator], "Validator already exists");
        
        validators[chainId][validator] = true;
        chainConfigs[chainId].validatorCount++;
        
        emit ValidatorAdded(validator, chainId, block.timestamp);
    }
    
    /**
     * @dev Remove validator from a chain
     * @param validator Validator address
     * @param chainId Chain ID
     */
    function removeValidator(address validator, uint256 chainId) 
        external 
        onlyOwner 
        validChain(chainId)
    {
        require(validators[chainId][validator], "Validator does not exist");
        require(chainConfigs[chainId].validatorCount > MIN_VALIDATORS, "Too few validators");
        
        validators[chainId][validator] = false;
        chainConfigs[chainId].validatorCount--;
        
        emit ValidatorRemoved(validator, chainId, block.timestamp);
    }
    
    /**
     * @dev Add new supported chain
     * @param chainId Chain ID
     * @param minSwapAmount Minimum swap amount
     * @param maxSwapAmount Maximum swap amount
     * @param swapFee Swap fee
     */
    function addSupportedChain(
        uint256 chainId,
        uint256 minSwapAmount,
        uint256 maxSwapAmount,
        uint256 swapFee
    ) 
        external 
        onlyOwner 
    {
        require(!chainConfigs[chainId].isSupported, "Chain already supported");
        
        chainConfigs[chainId] = ChainConfig({
            chainId: chainId,
            isSupported: true,
            minSwapAmount: minSwapAmount,
            maxSwapAmount: maxSwapAmount,
            swapFee: swapFee,
            validatorCount: 0
        });
    }
    
    /**
     * @dev Update chain configuration
     * @param chainId Chain ID
     * @param minSwapAmount Minimum swap amount
     * @param maxSwapAmount Maximum swap amount
     * @param swapFee Swap fee
     */
    function updateChainConfig(
        uint256 chainId,
        uint256 minSwapAmount,
        uint256 maxSwapAmount,
        uint256 swapFee
    ) 
        external 
        onlyOwner 
        validChain(chainId)
    {
        chainConfigs[chainId].minSwapAmount = minSwapAmount;
        chainConfigs[chainId].maxSwapAmount = maxSwapAmount;
        chainConfigs[chainId].swapFee = swapFee;
    }
    
    /**
     * @dev Get swap request information
     * @param swapId Swap ID
     * @return sender Sender address
     * @return recipient Recipient address
     * @return fromChainId Source chain ID
     * @return toChainId Target chain ID
     * @return amount Swap amount
     * @return timestamp Swap timestamp
     * @return isCompleted Whether swap is completed
     * @return isCancelled Whether swap is cancelled
     */
    function getSwapInfo(bytes32 swapId) 
        external 
        view 
        returns (
            address sender,
            address recipient,
            uint256 fromChainId,
            uint256 toChainId,
            uint256 amount,
            uint256 timestamp,
            bool isCompleted,
            bool isCancelled
        ) 
    {
        SwapRequest memory swap = swapRequests[swapId];
        return (
            swap.sender,
            swap.recipient,
            swap.fromChainId,
            swap.toChainId,
            swap.amount,
            swap.timestamp,
            swap.isCompleted,
            swap.isCancelled
        );
    }
    
    /**
     * @dev Get user's swap IDs
     * @param user User address
     * @return Array of swap IDs
     */
    function getUserSwaps(address user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userSwaps[user];
    }
    
    /**
     * @dev Get chain configuration
     * @param chainId Chain ID
     * @return isSupported Whether chain is supported
     * @return minSwapAmount Minimum swap amount
     * @return maxSwapAmount Maximum swap amount
     * @return swapFee Swap fee
     * @return validatorCount Number of validators
     */
    function getChainConfig(uint256 chainId) 
        external 
        view 
        returns (
            bool isSupported,
            uint256 minSwapAmount,
            uint256 maxSwapAmount,
            uint256 swapFee,
            uint256 validatorCount
        ) 
    {
        ChainConfig memory config = chainConfigs[chainId];
        return (
            config.isSupported,
            config.minSwapAmount,
            config.maxSwapAmount,
            config.swapFee,
            config.validatorCount
        );
    }
    
    /**
     * @dev Check if address is validator for chain
     * @param validator Validator address
     * @param chainId Chain ID
     * @return True if validator
     */
    function isValidator(address validator, uint256 chainId) 
        external 
        view 
        returns (bool) 
    {
        return validators[chainId][validator];
    }
    
    /**
     * @dev Verify validator signatures
     * @param swapId Swap ID
     * @param recipient Recipient address
     * @param amount Amount
     * @param signatures Array of signatures
     * @return True if signatures are valid
     */
    function verifyValidatorSignatures(
        bytes32 swapId,
        address recipient,
        uint256 amount,
        bytes[] memory signatures
    ) 
        internal 
        view 
        returns (bool) 
    {
        require(signatures.length >= MIN_VALIDATORS, "Insufficient signatures");
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            swapId,
            recipient,
            amount,
            block.chainid
        ));
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address[] memory signers = new address[](signatures.length);
        
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = ethSignedMessageHash.recover(signatures[i]);
            require(validators[block.chainid][signer], "Invalid validator signature");
            
            // Check for duplicate signatures
            for (uint256 j = 0; j < i; j++) {
                require(signers[j] != signer, "Duplicate signature");
            }
            
            signers[i] = signer;
        }
        
        return true;
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
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Fee withdrawal failed");
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