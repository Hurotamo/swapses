import { expect } from "chai";
import { ethers } from "hardhat";
import { WalletSplitter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("WalletSplitter", function () {
  let walletSplitter: WalletSplitter;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let level1Children: string[];
  let level2Children: string[];
  let level3Children: string[];

  beforeEach(async function () {
    // Get signers
    [owner, user, user2] = await ethers.getSigners();

    // Deploy contract
    const WalletSplitter = await ethers.getContractFactory("WalletSplitter");
    walletSplitter = await WalletSplitter.deploy();

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

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await walletSplitter.getAddress()).to.be.properAddress;
    });

    it("Should have correct owner", async function () {
      expect(await walletSplitter.owner()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      expect(await walletSplitter.paused()).to.be.false;
    });
  });

  describe("Constants", function () {
    it("Should have correct child counts", async function () {
      expect(await walletSplitter.LEVEL_1_CHILD_COUNT()).to.equal(100);
      expect(await walletSplitter.LEVEL_2_CHILD_COUNT()).to.equal(50);
      expect(await walletSplitter.LEVEL_3_CHILD_COUNT()).to.equal(20);
    });

    it("Should have correct MIN_SPLIT_AMOUNT", async function () {
      expect(await walletSplitter.MIN_SPLIT_AMOUNT()).to.equal(ethers.parseEther("0.01"));
    });

    it("Should have correct fees", async function () {
      expect(await walletSplitter.SPLIT_FEE()).to.equal(ethers.parseEther("0.001"));
      expect(await walletSplitter.PROXY_CREATION_FEE()).to.equal(ethers.parseEther("0.0005"));
    });
  });

  describe("createSplit - Level 1", function () {
    const splitAmount = ethers.parseEther("1.0");
    const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

    it("Should split ETH to 100 child wallets at level 1", async function () {
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

    it("Should mark parent wallet as split at level 1", async function () {
      await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      expect(await walletSplitter.hasSplitLevel1(user.address)).to.be.true;
    });

    it("Should fail with incorrect number of child wallets for level 1", async function () {
      const invalidChildren = level1Children.slice(0, 99); // Only 99 children

      await expect(
        walletSplitter.connect(user).createSplit(
          invalidChildren,
          0, // LEVEL_1
          encryptionKey,
          {
            value: splitAmount,
          }
        )
      ).to.be.revertedWith("Invalid child count for level");
    });

    it("Should fail if parent wallet has already split at level 1", async function () {
      // First split
      await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      // Second split attempt
      await expect(
        walletSplitter.connect(user).createSplit(
          level1Children,
          0, // LEVEL_1
          encryptionKey,
          {
            value: splitAmount,
          }
        )
      ).to.be.revertedWith("Already split at level 1");
    });
  });

  describe("createSplit - Level 2", function () {
    const splitAmount = ethers.parseEther("0.5");
    const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key-2"));

    it("Should split ETH to 50 child wallets at level 2", async function () {
      const tx = await walletSplitter.connect(user).createSplit(
        level2Children,
        1, // LEVEL_2
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      expect(await walletSplitter.hasSplitLevel2(user.address)).to.be.true;
    });

    it("Should fail with incorrect number of child wallets for level 2", async function () {
      const invalidChildren = level2Children.slice(0, 49); // Only 49 children

      await expect(
        walletSplitter.connect(user).createSplit(
          invalidChildren,
          1, // LEVEL_2
          encryptionKey,
          {
            value: splitAmount,
          }
        )
      ).to.be.revertedWith("Invalid child count for level");
    });
  });

  describe("createSplit - Level 3", function () {
    const splitAmount = ethers.parseEther("0.2");
    const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key-3"));

    it("Should split ETH to 20 child wallets at level 3", async function () {
      const tx = await walletSplitter.connect(user).createSplit(
        level3Children,
        2, // LEVEL_3
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      await expect(tx)
        .to.emit(walletSplitter, "SplitInitiated");

      expect(await walletSplitter.hasSplitLevel3(user.address)).to.be.true;
    });

    it("Should fail with incorrect number of child wallets for level 3", async function () {
      const invalidChildren = level3Children.slice(0, 19); // Only 19 children

      await expect(
        walletSplitter.connect(user).createSplit(
          invalidChildren,
          2, // LEVEL_3
          encryptionKey,
          {
            value: splitAmount,
          }
        )
      ).to.be.revertedWith("Invalid child count for level");
    });
  });

  describe("Proxy Wallet", function () {
    it("Should create proxy wallet successfully", async function () {
      const tx = await walletSplitter.connect(user).createProxyWallet(user.address, {
        value: ethers.parseEther("0.0005"),
      });

      await expect(tx)
        .to.emit(walletSplitter, "ProxyWalletCreated");

      const [proxyAddress, isActive, balance] = await walletSplitter.getProxyWallet(user.address);
      expect(proxyAddress).to.not.equal(ethers.ZeroAddress);
      expect(isActive).to.be.true;
      expect(balance).to.equal(0);
    });

    it("Should fail to create proxy wallet twice", async function () {
      await walletSplitter.connect(user).createProxyWallet(user.address, {
        value: ethers.parseEther("0.0005"),
      });

      await expect(
        walletSplitter.connect(user).createProxyWallet(user.address, {
          value: ethers.parseEther("0.0005"),
        })
      ).to.be.revertedWith("Proxy already exists");
    });

    it("Should fail with insufficient fee for proxy creation", async function () {
      await expect(
        walletSplitter.connect(user).createProxyWallet(user.address, {
          value: ethers.parseEther("0.0001"), // Less than required fee
        })
      ).to.be.revertedWith("Insufficient fee for proxy creation");
    });
  });

  describe("getSplitInfo", function () {
    it("Should return correct split information with valid key", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      // Get the actual split ID from the user's splits
      const userSplits = await walletSplitter.getUserSplits(user.address);
      expect(userSplits.length).to.be.greaterThan(0);
      
      const splitId = userSplits[0];
      const [children, amount, level, isActive] = await walletSplitter.connect(user).getSplitInfo(splitId, encryptionKey);

      expect(children).to.deep.equal(level1Children);
      expect(amount).to.equal(splitAmount);
      expect(level).to.equal(0); // LEVEL_1
      expect(isActive).to.be.true;
    });

    it("Should fail with invalid encryption key", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));
      const wrongKey = ethers.keccak256(ethers.toUtf8Bytes("wrong-key"));

      await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      const splitId = await getSplitId(user.address, 0, encryptionKey);
      await expect(
        walletSplitter.getSplitInfo(splitId, wrongKey)
      ).to.be.revertedWith("Invalid encryption key");
    });

    it("Should fail when not authorized", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      // Get the actual split ID from the user's splits
      const userSplits = await walletSplitter.getUserSplits(user.address);
      expect(userSplits.length).to.be.greaterThan(0);
      
      const splitId = userSplits[0];
      await expect(
        walletSplitter.connect(user2).getSplitInfo(splitId, encryptionKey)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("getUserSplits", function () {
    it("Should return user's split IDs", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      const userSplits = await walletSplitter.getUserSplits(user.address);
      expect(userSplits.length).to.equal(1);
    });
  });

  describe("getChildCount", function () {
    it("Should return correct child counts for each level", async function () {
      expect(await walletSplitter.getChildCount(0)).to.equal(100); // LEVEL_1
      expect(await walletSplitter.getChildCount(1)).to.equal(50);  // LEVEL_2
      expect(await walletSplitter.getChildCount(2)).to.equal(20);  // LEVEL_3
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow owner to pause", async function () {
      await walletSplitter.connect(owner).pause();
      expect(await walletSplitter.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await walletSplitter.connect(owner).pause();
      await walletSplitter.connect(owner).unpause();
      expect(await walletSplitter.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(walletSplitter.connect(user).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow owner to withdraw funds", async function () {
      // Send some ETH to contract
      await owner.sendTransaction({
        to: await walletSplitter.getAddress(),
        value: ethers.parseEther("1"),
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await walletSplitter.connect(owner).emergencyWithdraw();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(walletSplitter.connect(user).emergencyWithdraw()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Withdraw Fees", function () {
    it("Should allow owner to withdraw fees", async function () {
      const splitAmount = ethers.parseEther("1.0");
      const encryptionKey = ethers.keccak256(ethers.toUtf8Bytes("test-key"));

      // Create a split to generate fees
      await walletSplitter.connect(user).createSplit(
        level1Children,
        0, // LEVEL_1
        encryptionKey,
        {
          value: splitAmount,
        }
      );

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await walletSplitter.connect(owner).withdrawFees();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("Should not allow non-owner to withdraw fees", async function () {
      await expect(walletSplitter.connect(user).withdrawFees()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Receive and Fallback", function () {
    it("Should accept ETH via receive function", async function () {
      const amount = ethers.parseEther("1");
      await owner.sendTransaction({
        to: await walletSplitter.getAddress(),
        value: amount,
      });

      const contractBalance = await ethers.provider.getBalance(await walletSplitter.getAddress());
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

// Helper function to calculate split ID
async function getSplitId(user: string, level: number, encryptionKey: string): Promise<string> {
  const timestamp = await time();
  return ethers.keccak256(ethers.solidityPacked(
    ["address", "uint256", "uint256", "bytes32"],
    [user, level, timestamp, encryptionKey]
  ));
}

// Helper function to calculate proxy address
async function getProxyAddress(originalWallet: string): Promise<string> {
  const timestamp = await time();
  const chainId = await ethers.provider.getNetwork().then(net => net.chainId);
  const hash = ethers.keccak256(ethers.solidityPacked(
    ["address", "uint256", "uint256"],
    [originalWallet, timestamp, chainId]
  ));
  return ethers.getAddress(hash.slice(0, 42)); // Convert to valid address format
} 