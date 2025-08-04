import { expect } from "chai";
import { ethers } from "hardhat";
import { WalletSplitter, PrivacyMixer } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Privacy Integration", function () {
  let walletSplitter: WalletSplitter;
  let privacyMixer: PrivacyMixer;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let level1Children: string[];
  let level2Children: string[];
  let level3Children: string[];

  beforeEach(async function () {
    // Get signers
    [owner, user, user2] = await ethers.getSigners();

    // Deploy contracts
    const PrivacyMixer = await ethers.getContractFactory("PrivacyMixer");
    privacyMixer = await PrivacyMixer.deploy();

    const WalletSplitter = await ethers.getContractFactory("WalletSplitter");
    walletSplitter = await WalletSplitter.deploy();

    // Set up integration
    await walletSplitter.setPrivacyMixer(await privacyMixer.getAddress());

    // Create mixing pools
    await privacyMixer.createMixingPool(3600, 21600); // Fast pool (1-6 hours)
    await privacyMixer.createMixingPool(21600, 86400); // Standard pool (6-24 hours)
    await privacyMixer.createMixingPool(86400, 604800); // Long pool (1-7 days)

    // Generate child wallet addresses for testing
    level1Children = [];
    level2Children = [];
    level3Children = [];
    
    for (let i = 0; i < 100; i++) {
      const wallet = ethers.Wallet.createRandom();
      level1Children.push(wallet.address);
    }
    
    for (let i = 0; i < 50; i++) {
      const wallet = ethers.Wallet.createRandom();
      level2Children.push(wallet.address);
    }
    
    for (let i = 0; i < 20; i++) {
      const wallet = ethers.Wallet.createRandom();
      level3Children.push(wallet.address);
    }
  });

  describe("Privacy Mixer", function () {
    it("Should deploy successfully", async function () {
      expect(await privacyMixer.getAddress()).to.be.properAddress;
    });

    it("Should create mixing pools", async function () {
      const [totalAmount, participantCount, minDelay, maxDelay, isActive] = await privacyMixer.getPoolInfo(1);
      expect(isActive).to.be.true;
      expect(minDelay).to.equal(3600); // 1 hour
      expect(maxDelay).to.equal(21600); // 6 hours
    });

    it("Should accept deposits", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const depositAmount = ethers.parseEther("1.0");
      const mixingDelay = 7200; // 2 hours

      const tx = await privacyMixer.connect(user).deposit(commitment, 1, mixingDelay, {
        value: depositAmount,
      });

      await expect(tx)
        .to.emit(privacyMixer, "DepositCreated")
        .withArgs(commitment, depositAmount, await time());

      const [amount, timestamp, isWithdrawn, delay] = await privacyMixer.getDepositInfo(commitment);
      expect(amount).to.equal(depositAmount);
      expect(delay).to.equal(mixingDelay);
      expect(isWithdrawn).to.be.false;
    });

    it("Should reject invalid deposit amounts", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const smallAmount = ethers.parseEther("0.005"); // Below minimum

      await expect(
        privacyMixer.connect(user).deposit(commitment, 1, 7200, { // 2 hours
          value: smallAmount,
        })
      ).to.be.revertedWith("Invalid deposit amount");
    });

    it("Should reject invalid mixing delays", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      const depositAmount = ethers.parseEther("1.0");
      const invalidDelay = 1800; // 30 minutes - below minimum

      await expect(
        privacyMixer.connect(user).deposit(commitment, 1, invalidDelay, {
          value: depositAmount,
        })
      ).to.be.revertedWith("Invalid mixing delay");
    });
  });

  describe("Privacy Integration", function () {
    it("Should integrate mixer with splitter", async function () {
      const mixerAddress = await walletSplitter.getPrivacyMixer();
      expect(mixerAddress).to.equal(await privacyMixer.getAddress());
    });

    it("Should create private split with mixer", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const mixingDelay = 2 * 60 * 60; // 2 hours in seconds

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        1, // MIXER mode
        mixingDelay,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      await expect(tx)
        .to.emit(walletSplitter, "PrivateSplitExecuted");
    });

    it("Should create private split with both mixer and proxy", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const mixingDelay = 2 * 60 * 60; // 2 hours in seconds

      // First create proxy wallet
      await walletSplitter.connect(user).createProxyWallet(user.address, {
        value: ethers.parseEther("0.0005"),
      });

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        3, // BOTH mode
        mixingDelay,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      await expect(tx)
        .to.emit(walletSplitter, "PrivateSplitExecuted");
    });

    it("Should handle legacy createSplit function", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      const tx = await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      await expect(tx)
        .to.emit(walletSplitter, "SplitCompleted");
    });
  });

  describe("Privacy Modes", function () {
    it("Should handle NONE privacy mode", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        0, // NONE mode
        0,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      await expect(tx)
        .to.emit(walletSplitter, "SplitCompleted");
    });

    it("Should handle MIXER privacy mode", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const mixingDelay = 2 * 60 * 60; // 2 hours in seconds

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        1, // MIXER mode
        mixingDelay,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      await expect(tx)
        .to.emit(walletSplitter, "PrivateSplitExecuted");
    });

    it("Should handle PROXY privacy mode", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      // Create proxy wallet first
      await walletSplitter.connect(user).createProxyWallet(user.address, {
        value: ethers.parseEther("0.0005"),
      });

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        2, // PROXY mode
        0,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      await expect(tx)
        .to.emit(walletSplitter, "SplitCompleted");
    });

    it("Should handle BOTH privacy mode", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const mixingDelay = 2 * 60 * 60; // 2 hours in seconds

      // Create proxy wallet first
      await walletSplitter.connect(user).createProxyWallet(user.address, {
        value: ethers.parseEther("0.0005"),
      });

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        3, // BOTH mode
        mixingDelay,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      await expect(tx)
        .to.emit(walletSplitter, "PrivateSplitExecuted");
    });
  });

  describe("Multi-Level Privacy", function () {
    it("Should handle Level 1 with privacy", async function () {
      const splitAmount = ethers.parseEther("2.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const mixingDelay = 2 * 60 * 60; // 2 hours in seconds

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        1, // MIXER mode
        mixingDelay,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "PrivateSplitExecuted");

      expect(await walletSplitter.hasSplitLevel1(user.address)).to.be.true;
    });

    it("Should handle Level 2 with privacy", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const mixingDelay = 2 * 60 * 60; // 2 hours in seconds

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level2Children,
        1, // LEVEL_2
        encryptionKey,
        1, // MIXER mode
        mixingDelay,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "PrivateSplitExecuted");

      expect(await walletSplitter.hasSplitLevel2(user.address)).to.be.true;
    });

    it("Should handle Level 3 with privacy", async function () {
      const splitAmount = ethers.parseEther("0.5");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const mixingDelay = 2 * 60 * 60; // 2 hours in seconds

      const tx = await walletSplitter.connect(user).createPrivateSplit(
        level3Children,
        2, // LEVEL_3
        encryptionKey,
        1, // MIXER mode
        mixingDelay,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "PrivateSplitExecuted");

      expect(await walletSplitter.hasSplitLevel3(user.address)).to.be.true;
    });
  });

  describe("Privacy Configuration", function () {
    it("Should reject mixer operations when mixer not set", async function () {
      // Deploy new splitter without mixer
      const WalletSplitter = await ethers.getContractFactory("WalletSplitter");
      const newSplitter = await WalletSplitter.deploy();

      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      await expect(
        newSplitter.connect(user).createPrivateSplit(
          level1Children,
          0, // LEVEL_1
          encryptionKey,
          1, // MIXER mode
          2 * 60 * 60, // 2 hours in seconds
          {
            value: splitAmount,
          }
        )
      ).to.be.revertedWith("Mixer not enabled");
    });

    it("Should allow owner to set mixer", async function () {
      const WalletSplitter = await ethers.getContractFactory("WalletSplitter");
      const newSplitter = await WalletSplitter.deploy();

      const mixerAddress = await privacyMixer.getAddress();
      await newSplitter.setPrivacyMixer(mixerAddress);

      expect(await newSplitter.getPrivacyMixer()).to.equal(mixerAddress);
    });

    it("Should reject non-owner from setting mixer", async function () {
      const WalletSplitter = await ethers.getContractFactory("WalletSplitter");
      const newSplitter = await WalletSplitter.deploy();

      const mixerAddress = await privacyMixer.getAddress();

      await expect(
        newSplitter.connect(user).setPrivacyMixer(mixerAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow owner to pause contracts", async function () {
      await walletSplitter.pause();
      expect(await walletSplitter.paused()).to.be.true;

      await privacyMixer.pause();
      expect(await privacyMixer.paused()).to.be.true;
    });

    it("Should allow owner to unpause contracts", async function () {
      await walletSplitter.pause();
      await walletSplitter.unpause();
      expect(await walletSplitter.paused()).to.be.false;

      await privacyMixer.pause();
      await privacyMixer.unpause();
      expect(await privacyMixer.paused()).to.be.false;
    });

    it("Should reject non-owner from pausing", async function () {
      await expect(walletSplitter.connect(user).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );

      await expect(privacyMixer.connect(user).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
});

// Helper function to get current timestamp
async function time(): Promise<bigint> {
  const blockNum = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNum);
  return block!.timestamp;
} 