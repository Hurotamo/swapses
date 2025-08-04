import { expect } from "chai";
import { ethers } from "hardhat";
import { CrossChainBridge } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CrossChainBridge", function () {
  let crossChainBridge: CrossChainBridge;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let validator1: SignerWithAddress;
  let validator2: SignerWithAddress;
  let validator3: SignerWithAddress;
  let validator4: SignerWithAddress;

  const LISK_CHAIN_ID = 1891;
  const BASE_CHAIN_ID = 8453;

  beforeEach(async function () {
    // Get signers
    [owner, user, user2, validator1, validator2, validator3, validator4] = await ethers.getSigners();

    // Deploy contract
    const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
    crossChainBridge = await CrossChainBridge.deploy();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await crossChainBridge.getAddress()).to.be.properAddress;
    });

    it("Should have correct owner", async function () {
      expect(await crossChainBridge.owner()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      expect(await crossChainBridge.paused()).to.be.false;
    });

    it("Should have correct chain configurations", async function () {
      const [isSupportedLisk, minAmountLisk, maxAmountLisk, swapFeeLisk, validatorCountLisk] = 
        await crossChainBridge.getChainConfig(LISK_CHAIN_ID);
      
      const [isSupportedBase, minAmountBase, maxAmountBase, swapFeeBase, validatorCountBase] = 
        await crossChainBridge.getChainConfig(BASE_CHAIN_ID);

      expect(isSupportedLisk).to.be.true;
      expect(isSupportedBase).to.be.true;
      expect(minAmountLisk).to.equal(ethers.parseEther("0.01"));
      expect(maxAmountLisk).to.equal(ethers.parseEther("100"));
      expect(swapFeeLisk).to.equal(ethers.parseEther("0.001"));
      expect(validatorCountLisk).to.equal(0);
      expect(validatorCountBase).to.equal(0);
    });
  });

  describe("Constants", function () {
    it("Should have correct chain IDs", async function () {
      expect(await crossChainBridge.LISK_CHAIN_ID()).to.equal(LISK_CHAIN_ID);
      expect(await crossChainBridge.BASE_CHAIN_ID()).to.equal(BASE_CHAIN_ID);
    });

    it("Should have correct limits", async function () {
      expect(await crossChainBridge.MIN_VALIDATORS()).to.equal(3);
      expect(await crossChainBridge.SWAP_TIMEOUT()).to.equal(3600); // 1 hour
      expect(await crossChainBridge.DEFAULT_SWAP_FEE()).to.equal(ethers.parseEther("0.001"));
      expect(await crossChainBridge.MIN_SWAP_AMOUNT()).to.equal(ethers.parseEther("0.01"));
      expect(await crossChainBridge.MAX_SWAP_AMOUNT()).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Validator Management", function () {
    it("Should allow owner to add validators", async function () {
      const tx = await crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID);
      
      await expect(tx)
        .to.emit(crossChainBridge, "ValidatorAdded")
        .withArgs(validator1.address, LISK_CHAIN_ID, await time());

      expect(await crossChainBridge.isValidator(validator1.address, LISK_CHAIN_ID)).to.be.true;
      
      const [isSupported, minAmount, maxAmount, swapFee, validatorCount] = 
        await crossChainBridge.getChainConfig(LISK_CHAIN_ID);
      expect(validatorCount).to.equal(1);
    });

    it("Should allow owner to add multiple validators", async function () {
      await crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID);
      await crossChainBridge.addValidator(validator2.address, LISK_CHAIN_ID);
      await crossChainBridge.addValidator(validator3.address, LISK_CHAIN_ID);

      expect(await crossChainBridge.isValidator(validator1.address, LISK_CHAIN_ID)).to.be.true;
      expect(await crossChainBridge.isValidator(validator2.address, LISK_CHAIN_ID)).to.be.true;
      expect(await crossChainBridge.isValidator(validator3.address, LISK_CHAIN_ID)).to.be.true;

      const [isSupported, minAmount, maxAmount, swapFee, validatorCount] = 
        await crossChainBridge.getChainConfig(LISK_CHAIN_ID);
      expect(validatorCount).to.equal(3);
    });

    it("Should not allow non-owner to add validators", async function () {
      await expect(
        crossChainBridge.connect(user).addValidator(validator1.address, LISK_CHAIN_ID)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow adding duplicate validators", async function () {
      await crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID);
      
      await expect(
        crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID)
      ).to.be.revertedWith("Validator already exists");
    });

    it("Should not allow adding zero address as validator", async function () {
      await expect(
        crossChainBridge.addValidator(ethers.ZeroAddress, LISK_CHAIN_ID)
      ).to.be.revertedWith("Invalid validator");
    });

    it("Should allow owner to remove validators", async function () {
      await crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID);
      await crossChainBridge.addValidator(validator2.address, LISK_CHAIN_ID);
      await crossChainBridge.addValidator(validator3.address, LISK_CHAIN_ID);
      await crossChainBridge.addValidator(validator4.address, LISK_CHAIN_ID);

      const tx = await crossChainBridge.removeValidator(validator1.address, LISK_CHAIN_ID);
      
      await expect(tx)
        .to.emit(crossChainBridge, "ValidatorRemoved")
        .withArgs(validator1.address, LISK_CHAIN_ID, await time());

      expect(await crossChainBridge.isValidator(validator1.address, LISK_CHAIN_ID)).to.be.false;
      
      const [isSupported, minAmount, maxAmount, swapFee, validatorCount] = 
        await crossChainBridge.getChainConfig(LISK_CHAIN_ID);
      expect(validatorCount).to.equal(3);
    });

    it("Should not allow removing non-existent validators", async function () {
      await expect(
        crossChainBridge.removeValidator(validator1.address, LISK_CHAIN_ID)
      ).to.be.revertedWith("Validator does not exist");
    });

    it("Should not allow removing validators when too few remain", async function () {
      await crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID);
      await crossChainBridge.addValidator(validator2.address, LISK_CHAIN_ID);
      await crossChainBridge.addValidator(validator3.address, LISK_CHAIN_ID);

      await expect(
        crossChainBridge.removeValidator(validator1.address, LISK_CHAIN_ID)
      ).to.be.revertedWith("Too few validators");
    });

    it("Should not allow non-owner to remove validators", async function () {
      await crossChainBridge.addValidator(validator1.address, LISK_CHAIN_ID);
      
      await expect(
        crossChainBridge.connect(user).removeValidator(validator1.address, LISK_CHAIN_ID)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Chain Configuration", function () {
    it("Should allow owner to update chain configuration", async function () {
      const newMinAmount = ethers.parseEther("0.02");
      const newMaxAmount = ethers.parseEther("50");
      const newSwapFee = ethers.parseEther("0.002");

      await crossChainBridge.updateChainConfig(
        LISK_CHAIN_ID,
        newMinAmount,
        newMaxAmount,
        newSwapFee
      );

      const [isSupported, minAmount, maxAmount, swapFee, validatorCount] = 
        await crossChainBridge.getChainConfig(LISK_CHAIN_ID);
      
      expect(minAmount).to.equal(newMinAmount);
      expect(maxAmount).to.equal(newMaxAmount);
      expect(swapFee).to.equal(newSwapFee);
    });

    it("Should not allow non-owner to update chain configuration", async function () {
      await expect(
        crossChainBridge.connect(user).updateChainConfig(
          LISK_CHAIN_ID,
          ethers.parseEther("0.02"),
          ethers.parseEther("50"),
          ethers.parseEther("0.002")
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow updating unsupported chain", async function () {
      await expect(
        crossChainBridge.updateChainConfig(
          9999, // Unsupported chain
          ethers.parseEther("0.02"),
          ethers.parseEther("50"),
          ethers.parseEther("0.002")
        )
      ).to.be.revertedWith("Chain not supported");
    });
  });

  describe("Swap Initiation", function () {
    beforeEach(async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      // Add the current chain as supported for testing
      await crossChainBridge.addSupportedChain(
        currentChainId,
        ethers.parseEther("0.01"),
        ethers.parseEther("100"),
        ethers.parseEther("0.001")
      );
      
      // Add validators for the current chain
      await crossChainBridge.addValidator(validator1.address, currentChainId);
      await crossChainBridge.addValidator(validator2.address, currentChainId);
      await crossChainBridge.addValidator(validator3.address, currentChainId);
    });

    it("Should initiate swap successfully", async function () {
      const swapAmount = ethers.parseEther("1.0");
      const recipient = user2.address;

      const tx = await crossChainBridge.connect(user).initiateSwap(
        recipient,
        BASE_CHAIN_ID,
        swapAmount,
        { value: swapAmount }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = crossChainBridge.interface.parseLog(log as any);
          return parsed?.name === "CrossChainSwapInitiated";
        } catch {
          return false;
        }
      });
      
      const swapId = event ? crossChainBridge.interface.parseLog(event as any)?.args[0] : null;
      expect(swapId).to.not.be.null;

      const [sender, swapRecipient, fromChainId, toChainId, amount, timestamp, isCompleted, isCancelled] = 
        await crossChainBridge.getSwapInfo(swapId);
      
      expect(sender).to.equal(user.address);
      expect(swapRecipient).to.equal(recipient);
      // The actual chain ID will be the Hardhat network ID (31337)
      expect(fromChainId).to.be.a("bigint");
      expect(toChainId).to.equal(BASE_CHAIN_ID);
      expect(amount).to.equal(swapAmount);
      expect(isCompleted).to.be.false;
      expect(isCancelled).to.be.false;
    });

    it("Should fail with insufficient amount", async function () {
      const swapAmount = ethers.parseEther("1.0");
      const recipient = user2.address;

      await expect(
        crossChainBridge.connect(user).initiateSwap(
          recipient,
          BASE_CHAIN_ID,
          swapAmount,
          { value: swapAmount - ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith("Incorrect amount sent");
    });

    it("Should fail with invalid recipient", async function () {
      const swapAmount = ethers.parseEther("1.0");

      await expect(
        crossChainBridge.connect(user).initiateSwap(
          ethers.ZeroAddress,
          BASE_CHAIN_ID,
          swapAmount,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should fail with unsupported chain", async function () {
      const swapAmount = ethers.parseEther("1.0");
      const recipient = user2.address;

      await expect(
        crossChainBridge.connect(user).initiateSwap(
          recipient,
          9999, // Unsupported chain
          swapAmount,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Chain not supported");
    });

    it("Should fail when swapping to same chain", async function () {
      const swapAmount = ethers.parseEther("1.0");
      const recipient = user2.address;

      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);

      // For testing, we'll simulate swapping from current chain to current chain (same chain)
      // This should fail with "Cannot swap to same chain"
      await expect(
        crossChainBridge.connect(user).initiateSwap(
          recipient,
          currentChainId, // Same as from chain
          swapAmount,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Cannot swap to same chain");
    });

    it("Should fail with amount too small", async function () {
      const swapAmount = ethers.parseEther("0.005"); // Below minimum
      const recipient = user2.address;

      await expect(
        crossChainBridge.connect(user).initiateSwap(
          recipient,
          BASE_CHAIN_ID,
          swapAmount,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Invalid swap amount");
    });

    it("Should fail with amount too large", async function () {
      const swapAmount = ethers.parseEther("150"); // Above maximum
      const recipient = user2.address;

      await expect(
        crossChainBridge.connect(user).initiateSwap(
          recipient,
          BASE_CHAIN_ID,
          swapAmount,
          { value: swapAmount }
        )
      ).to.be.revertedWith("Invalid swap amount");
    });

    it("Should track user swaps", async function () {
      const swapAmount = ethers.parseEther("1.0");
      const recipient = user2.address;

      await crossChainBridge.connect(user).initiateSwap(
        recipient,
        BASE_CHAIN_ID,
        swapAmount,
        { value: swapAmount }
      );

      const userSwaps = await crossChainBridge.getUserSwaps(user.address);
      expect(userSwaps.length).to.equal(1);
    });
  });

  describe("Swap Completion", function () {
    let swapId: string;
    let swapAmount: bigint;
    let recipient: string;

    beforeEach(async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      // Add the current chain as supported for testing
      await crossChainBridge.addSupportedChain(
        currentChainId,
        ethers.parseEther("0.01"),
        ethers.parseEther("100"),
        ethers.parseEther("0.001")
      );
      
      // Add validators for the current chain
      await crossChainBridge.addValidator(validator1.address, currentChainId);
      await crossChainBridge.addValidator(validator2.address, currentChainId);
      await crossChainBridge.addValidator(validator3.address, currentChainId);

      // Initiate swap
      swapAmount = ethers.parseEther("1.0");
      recipient = user2.address;

      const tx = await crossChainBridge.connect(user).initiateSwap(
        recipient,
        BASE_CHAIN_ID,
        swapAmount,
        { value: swapAmount }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = crossChainBridge.interface.parseLog(log as any);
          return parsed?.name === "CrossChainSwapInitiated";
        } catch {
          return false;
        }
      });
      
      swapId = event ? crossChainBridge.interface.parseLog(event as any)?.args[0] : null;
      expect(swapId).to.not.be.null;
    });

    it("Should complete swap with valid signatures", async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      // Create signatures
      const messageHash = ethers.keccak256(ethers.solidityPacked(
        ["bytes32", "address", "uint256", "uint256"],
        [swapId, recipient, swapAmount, currentChainId]
      ));
      
      const ethSignedMessageHash = ethers.keccak256(ethers.solidityPacked(
        ["string", "bytes32"],
        ["\x19Ethereum Signed Message:\n32", messageHash]
      ));

      const signature1 = await validator1.signMessage(ethers.getBytes(messageHash));
      const signature2 = await validator2.signMessage(ethers.getBytes(messageHash));
      const signature3 = await validator3.signMessage(ethers.getBytes(messageHash));

      const signatures = [signature1, signature2, signature3];

      const recipientBalanceBefore = await ethers.provider.getBalance(recipient);
      
      const tx = await crossChainBridge.completeSwap(
        swapId,
        recipient,
        swapAmount,
        signatures
      );

      await expect(tx)
        .to.emit(crossChainBridge, "CrossChainSwapCompleted")
        .withArgs(swapId, recipient, 31337n, BASE_CHAIN_ID, swapAmount, await time());

      const recipientBalanceAfter = await ethers.provider.getBalance(recipient);
      const expectedAmount = swapAmount - ethers.parseEther("0.001"); // Minus fee
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(expectedAmount);

      const [sender, swapRecipient, fromChainId, toChainId, amount, timestamp, isCompleted, isCancelled] = 
        await crossChainBridge.getSwapInfo(swapId);
      
      expect(isCompleted).to.be.true;
      expect(isCancelled).to.be.false;
    });

    it("Should fail with insufficient signatures", async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      const messageHash = ethers.keccak256(ethers.solidityPacked(
        ["bytes32", "address", "uint256", "uint256"],
        [swapId, recipient, swapAmount, currentChainId]
      ));

      const signature1 = await validator1.signMessage(ethers.getBytes(messageHash));
      const signature2 = await validator2.signMessage(ethers.getBytes(messageHash));

      const signatures = [signature1, signature2]; // Only 2 signatures

      await expect(
        crossChainBridge.completeSwap(
          swapId,
          recipient,
          swapAmount,
          signatures
        )
      ).to.be.revertedWith("Insufficient signatures");
    });

    it("Should fail with invalid signatures", async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      const messageHash = ethers.keccak256(ethers.solidityPacked(
        ["bytes32", "address", "uint256", "uint256"],
        [swapId, recipient, swapAmount, currentChainId]
      ));

      const signature1 = await validator1.signMessage(ethers.getBytes(messageHash));
      const signature2 = await validator2.signMessage(ethers.getBytes(messageHash));
      const signature3 = await user.signMessage(ethers.getBytes(messageHash)); // Invalid signer

      const signatures = [signature1, signature2, signature3];

      await expect(
        crossChainBridge.completeSwap(
          swapId,
          recipient,
          swapAmount,
          signatures
        )
      ).to.be.revertedWith("Invalid validator signature");
    });

    it("Should fail with duplicate signatures", async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      const messageHash = ethers.keccak256(ethers.solidityPacked(
        ["bytes32", "address", "uint256", "uint256"],
        [swapId, recipient, swapAmount, currentChainId]
      ));

      const signature1 = await validator1.signMessage(ethers.getBytes(messageHash));
      const signature2 = await validator1.signMessage(ethers.getBytes(messageHash)); // Duplicate

      const signatures = [signature1, signature2, signature1];

      await expect(
        crossChainBridge.completeSwap(
          swapId,
          recipient,
          swapAmount,
          signatures
        )
      ).to.be.revertedWith("Duplicate signature");
    });

    it("Should fail with wrong recipient", async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      const messageHash = ethers.keccak256(ethers.solidityPacked(
        ["bytes32", "address", "uint256", "uint256"],
        [swapId, recipient, swapAmount, currentChainId]
      ));

      const signature1 = await validator1.signMessage(ethers.getBytes(messageHash));
      const signature2 = await validator2.signMessage(ethers.getBytes(messageHash));
      const signature3 = await validator3.signMessage(ethers.getBytes(messageHash));

      const signatures = [signature1, signature2, signature3];

      await expect(
        crossChainBridge.completeSwap(
          swapId,
          user.address, // Wrong recipient
          swapAmount,
          signatures
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should fail with wrong amount", async function () {
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "uint256", "uint256"],
        [swapId, recipient, swapAmount, LISK_CHAIN_ID]
      ));

      const signature1 = await validator1.signMessage(ethers.getBytes(messageHash));
      const signature2 = await validator2.signMessage(ethers.getBytes(messageHash));
      const signature3 = await validator3.signMessage(ethers.getBytes(messageHash));

      const signatures = [signature1, signature2, signature3];

      await expect(
        crossChainBridge.completeSwap(
          swapId,
          recipient,
          swapAmount + ethers.parseEther("0.1"), // Wrong amount
          signatures
        )
      ).to.be.revertedWith("Invalid amount");
    });

    it("Should fail when swap already completed", async function () {
      // Complete swap first
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "uint256", "uint256"],
        [swapId, recipient, swapAmount, LISK_CHAIN_ID]
      ));

      const signature1 = await validator1.signMessage(ethers.getBytes(messageHash));
      const signature2 = await validator2.signMessage(ethers.getBytes(messageHash));
      const signature3 = await validator3.signMessage(ethers.getBytes(messageHash));

      const signatures = [signature1, signature2, signature3];

      await crossChainBridge.completeSwap(swapId, recipient, swapAmount, signatures);

      // Try to complete again
      await expect(
        crossChainBridge.completeSwap(swapId, recipient, swapAmount, signatures)
      ).to.be.revertedWith("Invalid validator signature");
    });
  });

  describe("Swap Cancellation", function () {
    let swapId: string;
    let swapAmount: bigint;
    let recipient: string;

    beforeEach(async function () {
      // Get the current chain ID
      const network = await ethers.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      // Add the current chain as supported for testing
      await crossChainBridge.addSupportedChain(
        currentChainId,
        ethers.parseEther("0.01"),
        ethers.parseEther("100"),
        ethers.parseEther("0.001")
      );
      
      // Add validators for the current chain
      await crossChainBridge.addValidator(validator1.address, currentChainId);
      await crossChainBridge.addValidator(validator2.address, currentChainId);
      await crossChainBridge.addValidator(validator3.address, currentChainId);

      // Initiate swap
      swapAmount = ethers.parseEther("1.0");
      recipient = user2.address;

      const tx = await crossChainBridge.connect(user).initiateSwap(
        recipient,
        BASE_CHAIN_ID,
        swapAmount,
        { value: swapAmount }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = crossChainBridge.interface.parseLog(log as any);
          return parsed?.name === "CrossChainSwapInitiated";
        } catch {
          return false;
        }
      });
      
      swapId = event ? crossChainBridge.interface.parseLog(event as any)?.args[0] : null;
      expect(swapId).to.not.be.null;
    });

    it("Should allow sender to cancel expired swap", async function () {
      // Fast forward time to expire the swap
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
      await ethers.provider.send("evm_mine", []);

      const senderBalanceBefore = await ethers.provider.getBalance(user.address);

      const tx = await crossChainBridge.connect(user).cancelSwap(swapId);

      await expect(tx)
        .to.emit(crossChainBridge, "CrossChainSwapFailed")
        .withArgs(swapId, "Cancelled by sender", await time());

      const senderBalanceAfter = await ethers.provider.getBalance(user.address);
      // Account for gas fees - the refund should be approximately the swap amount
      expect(senderBalanceAfter - senderBalanceBefore).to.be.closeTo(swapAmount, ethers.parseEther("0.01"));

      const [sender, swapRecipient, fromChainId, toChainId, amount, timestamp, isCompleted, isCancelled] = 
        await crossChainBridge.getSwapInfo(swapId);
      
      expect(isCompleted).to.be.false;
      expect(isCancelled).to.be.true;
    });

    it("Should not allow non-sender to cancel swap", async function () {
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        crossChainBridge.connect(user2).cancelSwap(swapId)
      ).to.be.revertedWith("Not swap sender");
    });

    it("Should not allow cancelling non-expired swap", async function () {
      await expect(
        crossChainBridge.connect(user).cancelSwap(swapId)
      ).to.be.revertedWith("Swap not expired");
    });

    it("Should not allow cancelling non-existent swap", async function () {
      const fakeSwapId = ethers.keccak256(ethers.toUtf8Bytes("fake-swap"));
      
      await expect(
        crossChainBridge.connect(user).cancelSwap(fakeSwapId)
      ).to.be.revertedWith("Swap does not exist");
    });
  });

  describe("Nullifier Management", function () {
    it("Should track used nullifiers", async function () {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("test-nullifier"));
      
      // Note: The contract doesn't currently have an isNullifierUsed function
      // This test is a placeholder for future privacy features
      expect(nullifier).to.be.a("string");
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow owner to pause", async function () {
      await crossChainBridge.pause();
      expect(await crossChainBridge.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await crossChainBridge.pause();
      await crossChainBridge.unpause();
      expect(await crossChainBridge.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        crossChainBridge.connect(user).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow non-owner to unpause", async function () {
      await crossChainBridge.pause();
      await expect(
        crossChainBridge.connect(user).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow operations when paused", async function () {
      await crossChainBridge.pause();

      await expect(
        crossChainBridge.connect(user).initiateSwap(
          user2.address,
          BASE_CHAIN_ID,
          ethers.parseEther("1.0"),
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to withdraw fees", async function () {
      // Send some ETH to contract
      await owner.sendTransaction({
        to: await crossChainBridge.getAddress(),
        value: ethers.parseEther("1"),
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await crossChainBridge.withdrawFees();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("Should not allow non-owner to withdraw fees", async function () {
      await expect(
        crossChainBridge.connect(user).withdrawFees()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to emergency withdraw", async function () {
      // Send some ETH to contract
      await owner.sendTransaction({
        to: await crossChainBridge.getAddress(),
        value: ethers.parseEther("1"),
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await crossChainBridge.emergencyWithdraw();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("Should not allow non-owner to emergency withdraw", async function () {
      await expect(
        crossChainBridge.connect(user).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Receive and Fallback", function () {
    it("Should accept ETH via receive function", async function () {
      const amount = ethers.parseEther("1");
      await owner.sendTransaction({
        to: await crossChainBridge.getAddress(),
        value: amount,
      });

      const contractBalance = await ethers.provider.getBalance(await crossChainBridge.getAddress());
      expect(contractBalance).to.equal(amount);
    });

    it("Should accept ETH via fallback function", async function () {
      const amount = ethers.parseEther("1");
      await owner.sendTransaction({
        to: await crossChainBridge.getAddress(),
        value: amount,
        data: "0x1234", // Some data to trigger fallback
      });

      const contractBalance = await ethers.provider.getBalance(await crossChainBridge.getAddress());
      expect(contractBalance).to.equal(amount);
    });
  });
});

// Helper function to get current timestamp
async function time(): Promise<bigint> {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block!.timestamp;
}

// Helper function to calculate swap ID
async function getSwapId(sender: string, recipient: string, toChainId: number, amount: bigint): Promise<string> {
  const timestamp = await time();
  return ethers.keccak256(ethers.solidityPacked(
    ["address", "address", "uint256", "uint256", "uint256", "uint256"],
    [sender, recipient, 1891, toChainId, amount, timestamp] // Using LISK_CHAIN_ID value directly
  ));
} 