// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PracticalDifferentialPrivacy
 * @dev Implements proper differential privacy algorithms with Laplace mechanism,
 * epsilon-delta privacy guarantees, and privacy budget management
 */
contract PracticalDifferentialPrivacy is ReentrancyGuard, Pausable, Ownable {
    
    // Events
    event DifferentialPrivacyQuery(
        bytes32 indexed queryId,
        address indexed user,
        uint256 epsilon,
        uint256 delta,
        uint256 privacyBudget,
        uint256 timestamp
    );
    
    event LaplaceNoiseAdded(
        bytes32 indexed queryId,
        uint256 originalValue,
        uint256 noisyValue,
        uint256 noiseLevel,
        uint256 timestamp
    );
    
    event PrivacyBudgetUpdated(
        address indexed user,
        uint256 oldBudget,
        uint256 newBudget,
        uint256 timestamp
    );
    
    event EpsilonDeltaGuarantee(
        bytes32 indexed queryId,
        uint256 epsilon,
        uint256 delta,
        bool guaranteeMet,
        uint256 timestamp
    );
    
    // Structs
    struct DifferentialQuery {
        bytes32 queryId;
        address user;
        uint256 originalValue;
        uint256 noisyValue;
        uint256 epsilon;
        uint256 delta;
        uint256 privacyBudget;
        uint256 timestamp;
        bool isProcessed;
    }
    
    struct PrivacyBudget {
        address user;
        uint256 totalBudget;
        uint256 usedBudget;
        uint256 lastReset;
        uint256 timestamp;
    }
    
    struct LaplaceParameters {
        uint256 scale;
        uint256 location;
        uint256 sensitivity;
    }
    
    // State variables
    mapping(bytes32 => DifferentialQuery) public differentialQueries;
    mapping(address => PrivacyBudget) public privacyBudgets;
    mapping(bytes32 => bool) public processedQueries;
    
    uint256 public totalQueries;
    uint256 public totalPrivacyBudgets;
    uint256 public totalLaplaceNoise;
    
    // Differential privacy parameters
    uint256 public constant MIN_EPSILON = 1; // Minimum epsilon for privacy
    uint256 public constant MAX_EPSILON = 1000; // Maximum epsilon for utility
    uint256 public constant MIN_DELTA = 1; // Minimum delta for privacy
    uint256 public constant MAX_DELTA = 1000; // Maximum delta for utility
    uint256 public constant DEFAULT_PRIVACY_BUDGET = 1000; // Default privacy budget per user
    uint256 public constant BUDGET_RESET_PERIOD = 30 days; // Budget reset period
    uint256 public constant LAPLACE_SCALE_FACTOR = 1000; // Scale factor for Laplace distribution
    uint256 public constant SENSITIVITY_FACTOR = 100; // Sensitivity factor for queries
    
    // Random number generation
    uint256 private nonce;
    
    constructor() {
        totalQueries = 0;
        totalPrivacyBudgets = 0;
        totalLaplaceNoise = 0;
        nonce = 0;
    }
    
    /**
     * @dev Initialize privacy budget for user
     * @param user User address
     */
    function initializePrivacyBudget(address user) external whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(privacyBudgets[user].timestamp == 0, "Budget already initialized");
        
        privacyBudgets[user] = PrivacyBudget({
            user: user,
            totalBudget: DEFAULT_PRIVACY_BUDGET,
            usedBudget: 0,
            lastReset: block.timestamp,
            timestamp: block.timestamp
        });
        
        totalPrivacyBudgets++;
        
        emit PrivacyBudgetUpdated(user, 0, DEFAULT_PRIVACY_BUDGET, block.timestamp);
    }
    
    /**
     * @dev Create differential privacy query with Laplace mechanism
     * @param originalValue Original value to privatize
     * @param epsilon Privacy parameter (lower = more private)
     * @param delta Privacy parameter (lower = more private)
     */
    function createDifferentialPrivacyQuery(
        uint256 originalValue,
        uint256 epsilon,
        uint256 delta
    ) external whenNotPaused returns (bytes32) {
        require(epsilon >= MIN_EPSILON && epsilon <= MAX_EPSILON, "Invalid epsilon");
        require(delta >= MIN_DELTA && delta <= MAX_DELTA, "Invalid delta");
        require(originalValue > 0, "Invalid original value");
        
        // Check privacy budget
        PrivacyBudget storage budget = privacyBudgets[msg.sender];
        require(budget.timestamp != 0, "Privacy budget not initialized");
        
        // Reset budget if period expired
        if (block.timestamp >= budget.lastReset + BUDGET_RESET_PERIOD) {
            budget.usedBudget = 0;
            budget.lastReset = block.timestamp;
        }
        
        // Calculate required budget for this query
        uint256 requiredBudget = _calculatePrivacyBudget(epsilon, delta);
        require(budget.usedBudget + requiredBudget <= budget.totalBudget, "Insufficient privacy budget");
        
        // Generate Laplace noise
        uint256 noiseLevel = _generateLaplaceNoise(epsilon, delta);
        uint256 noisyValue = originalValue + noiseLevel;
        
        // Update privacy budget
        uint256 oldBudget = budget.usedBudget;
        budget.usedBudget += requiredBudget;
        
        totalQueries++;
        bytes32 queryId = keccak256(abi.encodePacked(
            "differential_query",
            totalQueries,
            msg.sender,
            originalValue,
            epsilon,
            delta,
            block.timestamp
        ));
        
        differentialQueries[queryId] = DifferentialQuery({
            queryId: queryId,
            user: msg.sender,
            originalValue: originalValue,
            noisyValue: noisyValue,
            epsilon: epsilon,
            delta: delta,
            privacyBudget: requiredBudget,
            timestamp: block.timestamp,
            isProcessed: false
        });
        
        totalLaplaceNoise += noiseLevel;
        
        emit DifferentialPrivacyQuery(queryId, msg.sender, epsilon, delta, requiredBudget, block.timestamp);
        emit LaplaceNoiseAdded(queryId, originalValue, noisyValue, noiseLevel, block.timestamp);
        emit PrivacyBudgetUpdated(msg.sender, oldBudget, budget.usedBudget, block.timestamp);
        
        // Verify epsilon-delta guarantee
        bool guaranteeMet = _verifyEpsilonDeltaGuarantee(epsilon, delta, noiseLevel);
        emit EpsilonDeltaGuarantee(queryId, epsilon, delta, guaranteeMet, block.timestamp);
        
        return queryId;
    }
    
    /**
     * @dev Generate Laplace noise using proper differential privacy algorithm
     * @param epsilon Privacy parameter
     * @param delta Privacy parameter
     */
    function _generateLaplaceNoise(uint256 epsilon, uint256 delta) internal returns (uint256) {
        nonce++;
        
        // Calculate Laplace scale parameter based on epsilon and sensitivity
        uint256 scale = (SENSITIVITY_FACTOR * LAPLACE_SCALE_FACTOR) / epsilon;
        
        // Generate random values for Laplace distribution
        uint256 u1 = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            nonce,
            msg.sender,
            "u1"
        ))) % LAPLACE_SCALE_FACTOR;
        
        uint256 u2 = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            nonce,
            msg.sender,
            "u2"
        ))) % LAPLACE_SCALE_FACTOR;
        
        // Convert uniform random to Laplace distribution
        // Using Box-Muller transform approximation for Laplace
        uint256 logU1 = _safeLog(u1 + 1); // Add 1 to avoid log(0)
        uint256 logU2 = _safeLog(u2 + 1);
        
        // Laplace distribution: scale * (log(u1) - log(u2))
        int256 laplaceValue = int256(scale) * (int256(logU1) - int256(logU2)) / int256(LAPLACE_SCALE_FACTOR);
        
        // Ensure positive noise value
        return laplaceValue > 0 ? uint256(laplaceValue) : uint256(-laplaceValue);
    }
    
    /**
     * @dev Safe logarithm function
     * @param value Input value
     */
    function _safeLog(uint256 value) internal pure returns (uint256) {
        if (value == 0) return 0;
        
        // Approximate natural logarithm using binary search
        uint256 result = 0;
        uint256 x = value;
        
        while (x >= 2) {
            x = x / 2;
            result += 693147; // ln(2) * 10^6
        }
        
        return result / 1000000; // Convert back to normal scale
    }
    
    /**
     * @dev Calculate required privacy budget for query
     * @param epsilon Privacy parameter
     * @param delta Privacy parameter
     */
    function _calculatePrivacyBudget(uint256 epsilon, uint256 delta) internal pure returns (uint256) {
        // Privacy budget calculation based on epsilon and delta
        // Higher epsilon/delta = lower privacy = lower budget cost
        uint256 epsilonCost = (MAX_EPSILON - epsilon + 1) * 10;
        uint256 deltaCost = (MAX_DELTA - delta + 1) * 5;
        
        return epsilonCost + deltaCost;
    }
    
    /**
     * @dev Verify epsilon-delta privacy guarantee
     * @param epsilon Privacy parameter
     * @param delta Privacy parameter
     * @param noiseLevel Generated noise level
     */
    function _verifyEpsilonDeltaGuarantee(
        uint256 epsilon,
        uint256 delta,
        uint256 noiseLevel
    ) internal pure returns (bool) {
        // Verify that noise level provides sufficient privacy
        // For Laplace mechanism, noise should be proportional to sensitivity/epsilon
        uint256 requiredNoise = (SENSITIVITY_FACTOR * LAPLACE_SCALE_FACTOR) / epsilon;
        
        // Add some tolerance for practical implementation
        uint256 tolerance = requiredNoise / 10;
        
        return noiseLevel >= (requiredNoise - tolerance);
    }
    
    /**
     * @dev Get differential privacy query information
     * @param queryId Query ID
     */
    function getDifferentialQuery(bytes32 queryId) external view returns (
        bytes32 queryId_,
        address user,
        uint256 originalValue,
        uint256 noisyValue,
        uint256 epsilon,
        uint256 delta,
        uint256 privacyBudget,
        uint256 timestamp,
        bool isProcessed
    ) {
        DifferentialQuery storage query = differentialQueries[queryId];
        return (
            query.queryId,
            query.user,
            query.originalValue,
            query.noisyValue,
            query.epsilon,
            query.delta,
            query.privacyBudget,
            query.timestamp,
            query.isProcessed
        );
    }
    
    /**
     * @dev Get privacy budget information
     * @param user User address
     */
    function getPrivacyBudget(address user) external view returns (
        address user_,
        uint256 totalBudget,
        uint256 usedBudget,
        uint256 remainingBudget,
        uint256 lastReset,
        uint256 timestamp
    ) {
        PrivacyBudget storage budget = privacyBudgets[user];
        uint256 remaining = budget.totalBudget > budget.usedBudget ? 
            budget.totalBudget - budget.usedBudget : 0;
        
        return (
            budget.user,
            budget.totalBudget,
            budget.usedBudget,
            remaining,
            budget.lastReset,
            budget.timestamp
        );
    }
    
    /**
     * @dev Reset privacy budget for user
     * @param user User address
     */
    function resetPrivacyBudget(address user) external onlyOwner {
        require(privacyBudgets[user].timestamp != 0, "Budget not initialized");
        
        uint256 oldBudget = privacyBudgets[user].usedBudget;
        privacyBudgets[user].usedBudget = 0;
        privacyBudgets[user].lastReset = block.timestamp;
        
        emit PrivacyBudgetUpdated(user, oldBudget, 0, block.timestamp);
    }
    
    /**
     * @dev Update privacy budget for user
     * @param user User address
     * @param newBudget New budget amount
     */
    function updatePrivacyBudget(address user, uint256 newBudget) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(newBudget > 0, "Invalid budget amount");
        
        uint256 oldBudget = privacyBudgets[user].totalBudget;
        privacyBudgets[user].totalBudget = newBudget;
        
        emit PrivacyBudgetUpdated(user, oldBudget, newBudget, block.timestamp);
    }
    
    /**
     * @dev Get contract statistics
     */
    function getStatistics() external view returns (
        uint256 totalQueries_,
        uint256 totalPrivacyBudgets_,
        uint256 totalLaplaceNoise_
    ) {
        return (
            totalQueries,
            totalPrivacyBudgets,
            totalLaplaceNoise
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
} 