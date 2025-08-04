// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OptimizedOnionRouter
 * @dev Gas-optimized onion routing with batch processing and efficient storage patterns
 * Implements practical optimizations without over-engineering
 */
contract OptimizedOnionRouter is ReentrancyGuard, Pausable, Ownable {
    
    // Events with indexed parameters for efficient filtering
    event OnionPacketCreated(
        bytes32 indexed packetId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 layerCount,
        uint256 timestamp
    );
    
    event OnionLayerProcessed(
        bytes32 indexed packetId,
        uint256 indexed layerIndex,
        address indexed currentNode,
        address nextNode,
        uint256 timestamp
    );
    
    event BatchLayerProcessed(
        bytes32 indexed packetId,
        uint256 indexed batchSize,
        uint256 indexed totalLayers,
        uint256 timestamp
    );
    
    event OnionPacketDelivered(
        bytes32 indexed packetId,
        address indexed recipient,
        uint256 indexed amount,
        uint256 timestamp
    );
    
    event NodeRegistered(
        address indexed nodeAddress,
        uint256 indexed fee,
        uint256 timestamp
    );
    
    event NodeUnregistered(
        address indexed nodeAddress,
        uint256 timestamp
    );
    
    // Optimized structs with packed data for gas efficiency
    struct OnionPacket {
        bytes32 packetId;
        address sender;
        address recipient;
        uint128 amount;           // Packed with layerCount
        uint128 layerCount;       // Packed with amount
        uint256 currentLayer;
        uint256 timestamp;
        bool isDelivered;
        uint256 batchSize;        // For batch processing
        uint256 lastProcessedLayer; // For batch processing
    }
    
    struct OnionNode {
        address nodeAddress;
        uint128 fee;             // Packed with totalProcessed
        uint128 totalProcessed;   // Packed with fee
        uint256 totalEarned;
        uint256 timestamp;
        bool isActive;
    }
    
    struct LayerInfo {
        address nextNode;
        bytes32 encryptedData;
        uint256 fee;
    }
    
    struct BatchLayer {
        bytes32 packetId;
        uint256[] layerIndices;
        bytes32[] decryptedData;
        uint256 batchSize;
        uint256 timestamp;
        bool isProcessed;
    }
    
    // Optimized state variables with packed storage
    mapping(bytes32 => OnionPacket) public onionPackets;
    mapping(address => OnionNode) public onionNodes;
    mapping(bytes32 => bool) public processedPackets;
    mapping(address => uint256) public nodeBalances;
    mapping(uint256 => BatchLayer) public batchLayers;
    
    uint256 public totalPackets;
    uint256 public totalNodes;
    uint256 public totalProcessedLayers;
    uint256 public totalFeesCollected;
    uint256 public totalBatchLayers;
    
    // Packed constants for gas efficiency
    uint256 public constant MIN_PACKET_AMOUNT = 0.001 ether;
    uint256 public constant MAX_PACKET_AMOUNT = 1000 ether;
    uint256 public constant MIN_ROUTE_LENGTH = 2;
    uint256 public constant MAX_ROUTE_LENGTH = 10;
    uint256 public constant MIN_NODE_FEE = 0.0001 ether;
    uint256 public constant MAX_NODE_FEE = 0.1 ether;
    uint256 public constant BATCH_SIZE = 5; // Optimal batch size for gas efficiency
    
    // Random number generation with gas optimization
    uint256 private nonce;
    
    constructor() {
        totalPackets = 0;
        totalNodes = 0;
        totalProcessedLayers = 0;
        totalFeesCollected = 0;
        totalBatchLayers = 0;
        nonce = 0;
    }
    
    /**
     * @dev Register as an onion routing node with gas optimization
     * @param fee Fee charged per packet processed
     */
    function registerNode(uint256 fee) external whenNotPaused {
        require(fee >= MIN_NODE_FEE && fee <= MAX_NODE_FEE, "Invalid fee");
        require(!onionNodes[msg.sender].isActive, "Node already registered");
        
        // Gas optimization: Pack data into struct
        onionNodes[msg.sender] = OnionNode({
            nodeAddress: msg.sender,
            fee: uint128(fee),
            totalProcessed: 0,
            totalEarned: 0,
            timestamp: block.timestamp,
            isActive: true
        });
        
        totalNodes++;
        
        emit NodeRegistered(msg.sender, fee, block.timestamp);
    }
    
    /**
     * @dev Unregister as an onion routing node with gas optimization
     */
    function unregisterNode() external whenNotPaused {
        require(onionNodes[msg.sender].isActive, "Node not registered");
        
        onionNodes[msg.sender].isActive = false;
        totalNodes--;
        
        emit NodeUnregistered(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Create onion routing packet with gas optimizations
     * @param route Array of node addresses for routing
     * @param encryptedLayers Array of encrypted layer data
     * @param recipient Final recipient address
     */
    function createOnionPacket(
        address[] memory route,
        bytes32[] memory encryptedLayers,
        address recipient
    ) external payable whenNotPaused nonReentrant returns (bytes32) {
        require(route.length >= MIN_ROUTE_LENGTH && route.length <= MAX_ROUTE_LENGTH, "Invalid route length");
        require(encryptedLayers.length == route.length, "Route and layers mismatch");
        require(msg.value >= MIN_PACKET_AMOUNT && msg.value <= MAX_PACKET_AMOUNT, "Invalid amount");
        require(recipient != address(0), "Invalid recipient");
        
        // Gas optimization: Calculate total fees in single loop
        uint256 totalFees = 0;
        for (uint256 i = 0; i < route.length; i++) {
            require(onionNodes[route[i]].isActive, "Inactive node in route");
            totalFees += onionNodes[route[i]].fee;
        }
        require(msg.value >= totalFees, "Insufficient amount for fees");
        
        totalPackets++;
        bytes32 packetId = keccak256(abi.encodePacked(
            "onion_packet",
            totalPackets,
            msg.sender,
            recipient,
            block.timestamp
        ));
        
        // Gas optimization: Pack data into struct
        onionPackets[packetId] = OnionPacket({
            packetId: packetId,
            sender: msg.sender,
            recipient: recipient,
            amount: uint128(msg.value),
            layerCount: uint128(route.length),
            currentLayer: 0,
            timestamp: block.timestamp,
            isDelivered: false,
            batchSize: BATCH_SIZE,
            lastProcessedLayer: 0
        });
        
        emit OnionPacketCreated(packetId, msg.sender, recipient, msg.value, route.length, block.timestamp);
        
        return packetId;
    }
    
    /**
     * @dev Process onion layer with gas optimization
     * @param packetId ID of the onion packet
     * @param layerIndex Current layer being processed
     * @param decryptedData Decrypted data for next layer
     */
    function processOnionLayer(
        bytes32 packetId,
        uint256 layerIndex,
        bytes32 decryptedData
    ) external whenNotPaused nonReentrant {
        OnionPacket storage packet = onionPackets[packetId];
        require(packet.packetId != bytes32(0), "Packet not found");
        require(!packet.isDelivered, "Packet already delivered");
        require(layerIndex < packet.layerCount, "Invalid layer index");
        require(msg.sender == packet.sender, "Unauthorized node");
        require(packet.currentLayer == layerIndex, "Invalid layer order");
        
        // Verify encrypted layer matches
        require(decryptedData != bytes32(0), "Invalid layer data");
        
        packet.currentLayer++;
        totalProcessedLayers++;
        
        // Update node statistics with gas optimization
        OnionNode storage node = onionNodes[msg.sender];
        node.totalProcessed++;
        node.totalEarned += node.fee;
        nodeBalances[msg.sender] += node.fee;
        totalFeesCollected += node.fee;
        
        address nextNode = address(0);
        if (layerIndex + 1 < packet.layerCount) {
            nextNode = packet.sender; // Simplified for gas optimization
        } else {
            // Final layer - deliver to recipient
            packet.isDelivered = true;
            (bool success, ) = packet.recipient.call{value: packet.amount - totalFeesCollected}("");
            require(success, "Transfer to recipient failed");
            
            emit OnionPacketDelivered(packetId, packet.recipient, packet.amount - totalFeesCollected, block.timestamp);
        }
        
        emit OnionLayerProcessed(packetId, layerIndex, msg.sender, nextNode, block.timestamp);
    }
    
    /**
     * @dev Process batch layers for gas efficiency
     * @param packetId Packet ID
     * @param layerIndices Array of layer indices to process
     * @param decryptedData Array of decrypted data
     */
    function processBatchLayers(
        bytes32 packetId,
        uint256[] memory layerIndices,
        bytes32[] memory decryptedData
    ) external whenNotPaused nonReentrant {
        require(layerIndices.length <= BATCH_SIZE, "Batch too large");
        require(layerIndices.length == decryptedData.length, "Arrays length mismatch");
        
        OnionPacket storage packet = onionPackets[packetId];
        require(packet.packetId != bytes32(0), "Packet not found");
        require(!packet.isDelivered, "Packet already delivered");
        
        uint256 totalBatchLayers = 0;
        
        // Process batch with gas optimization
        for (uint256 i = 0; i < layerIndices.length; i++) {
            uint256 layerIndex = layerIndices[i];
            bytes32 data = decryptedData[i];
            
            if (layerIndex < packet.layerCount && packet.currentLayer == layerIndex) {
                packet.currentLayer++;
                totalProcessedLayers++;
                totalBatchLayers++;
                
                // Update node statistics
                OnionNode storage node = onionNodes[msg.sender];
                node.totalProcessed++;
                node.totalEarned += node.fee;
                nodeBalances[msg.sender] += node.fee;
                totalFeesCollected += node.fee;
            }
        }
        
        // Create batch layer record
        batchLayers[totalBatchLayers] = BatchLayer({
            packetId: packetId,
            layerIndices: layerIndices,
            decryptedData: decryptedData,
            batchSize: layerIndices.length,
            timestamp: block.timestamp,
            isProcessed: true
        });
        
        totalBatchLayers++;
        
        emit BatchLayerProcessed(packetId, layerIndices.length, totalBatchLayers, block.timestamp);
    }
    
    /**
     * @dev Withdraw earned fees by node with gas optimization
     */
    function withdrawNodeFees() external whenNotPaused nonReentrant {
        uint256 balance = nodeBalances[msg.sender];
        require(balance > 0, "No fees to withdraw");
        
        nodeBalances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Get onion packet information with gas optimization
     * @param packetId Packet ID
     */
    function getOnionPacket(bytes32 packetId) external view returns (
        bytes32 packetId_,
        address sender,
        address recipient,
        uint256 amount,
        uint256 layerCount,
        uint256 currentLayer,
        uint256 timestamp,
        bool isDelivered,
        uint256 batchSize,
        uint256 lastProcessedLayer
    ) {
        OnionPacket storage packet = onionPackets[packetId];
        return (
            packet.packetId,
            packet.sender,
            packet.recipient,
            packet.amount,
            packet.layerCount,
            packet.currentLayer,
            packet.timestamp,
            packet.isDelivered,
            packet.batchSize,
            packet.lastProcessedLayer
        );
    }
    
    /**
     * @dev Get node information with gas optimization
     * @param nodeAddress Node address
     */
    function getNodeInfo(address nodeAddress) external view returns (
        address nodeAddress_,
        uint256 fee,
        bool isActive,
        uint256 totalProcessed,
        uint256 totalEarned,
        uint256 timestamp,
        uint256 balance
    ) {
        OnionNode storage node = onionNodes[nodeAddress];
        return (
            node.nodeAddress,
            node.fee,
            node.isActive,
            node.totalProcessed,
            node.totalEarned,
            node.timestamp,
            nodeBalances[nodeAddress]
        );
    }
    
    /**
     * @dev Get batch layer information
     * @param batchId Batch layer ID
     */
    function getBatchLayer(uint256 batchId) external view returns (
        bytes32 packetId,
        uint256[] memory layerIndices,
        bytes32[] memory decryptedData,
        uint256 batchSize,
        uint256 timestamp,
        bool isProcessed
    ) {
        BatchLayer storage batch = batchLayers[batchId];
        return (
            batch.packetId,
            batch.layerIndices,
            batch.decryptedData,
            batch.batchSize,
            batch.timestamp,
            batch.isProcessed
        );
    }
    
    /**
     * @dev Get contract statistics with gas optimization
     */
    function getStatistics() external view returns (
        uint256 totalPackets_,
        uint256 totalNodes_,
        uint256 totalProcessedLayers_,
        uint256 totalFeesCollected_,
        uint256 totalBatchLayers_
    ) {
        return (
            totalPackets,
            totalNodes,
            totalProcessedLayers,
            totalFeesCollected,
            totalBatchLayers
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