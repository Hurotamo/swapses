import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, Signer, BigNumber } from "ethers";

describe("PracticalDifferentialPrivacy", function () {
  let PracticalDifferentialPrivacy: ContractFactory;
  let differentialPrivacy: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [owner, user1, user2, user3, addr1, addr2] = await ethers.getSigners();
    
    PracticalDifferentialPrivacy = await ethers.getContractFactory("PracticalDifferentialPrivacy");
    differentialPrivacy = await PracticalDifferentialPrivacy.deploy();
    await differentialPrivacy.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const stats = await differentialPrivacy.getStatistics();
      expect(stats.totalQueries_).to.equal(0);
      expect(stats.totalPrivacyBudgets_).to.equal(0);
      expect(stats.totalLaplaceNoise_).to.equal(0);
    });

    it("Should have correct owner", async function () {
      expect(await differentialPrivacy.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("Privacy Budget Management", function () {
    it("Should initialize privacy budget successfully", async function () {
      const userAddress = await user1.getAddress();
      
      await differentialPrivacy.connect(owner).initializePrivacyBudget(userAddress);
      
      const budget = await differentialPrivacy.getPrivacyBudget(userAddress);
      expect(budget.user_).to.equal(userAddress);
      expect(budget.totalBudget).to.equal(1000); // DEFAULT_PRIVACY_BUDGET
      expect(budget.usedBudget).to.equal(0);
      expect(budget.remainingBudget).to.equal(1000);
      
      const stats = await differentialPrivacy.getStatistics();
      expect(stats.totalPrivacyBudgets_).to.equal(1);
    });

    it("Should fail to initialize budget for zero address", async function () {
      await expect(differentialPrivacy.connect(owner).initializePrivacyBudget(ethers.constants.AddressZero))
        .to.be.revertedWith("Invalid user address");
    });

    it("Should fail to initialize budget twice for same user", async function () {
      const userAddress = await user1.getAddress();
      
      await differentialPrivacy.connect(owner).initializePrivacyBudget(userAddress);
      
      await expect(differentialPrivacy.connect(owner).initializePrivacyBudget(userAddress))
        .to.be.revertedWith("Budget already initialized");
    });

    it("Should allow owner to reset privacy budget", async function () {
      const userAddress = await user1.getAddress();
      
      await differentialPrivacy.connect(owner).initializePrivacyBudget(userAddress);
      await differentialPrivacy.connect(owner).resetPrivacyBudget(userAddress);
      
      const budget = await differentialPrivacy.getPrivacyBudget(userAddress);
      expect(budget.usedBudget).to.equal(0);
    });

    it("Should allow owner to update privacy budget", async function () {
      const userAddress = await user1.getAddress();
      const newBudget = 2000;
      
      await differentialPrivacy.connect(owner).initializePrivacyBudget(userAddress);
      await differentialPrivacy.connect(owner).updatePrivacyBudget(userAddress, newBudget);
      
      const budget = await differentialPrivacy.getPrivacyBudget(userAddress);
      expect(budget.totalBudget).to.equal(newBudget);
      expect(budget.remainingBudget).to.equal(newBudget);
    });

    it("Should fail budget operations for non-owner", async function () {
      const userAddress = await user1.getAddress();
      
      await expect(differentialPrivacy.connect(user1).resetPrivacyBudget(userAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(differentialPrivacy.connect(user1).updatePrivacyBudget(userAddress, 2000))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Differential Privacy Queries", function () {
    beforeEach(async function () {
      // Initialize privacy budgets
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user1.getAddress());
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user2.getAddress());
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user3.getAddress());
    });

    it("Should create differential privacy query successfully", async function () {
      const originalValue = 100;
      const epsilon = 10;
      const delta = 5;
      
      const tx = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        originalValue,
        epsilon,
        delta
      );
      
      const receipt = await tx.wait();
      const queryEvent = receipt.events?.find(e => e.event === "DifferentialPrivacyQuery");
      const noiseEvent = receipt.events?.find(e => e.event === "LaplaceNoiseAdded");
      const guaranteeEvent = receipt.events?.find(e => e.event === "EpsilonDeltaGuarantee");
      
      expect(queryEvent).to.not.be.undefined;
      expect(noiseEvent).to.not.be.undefined;
      expect(guaranteeEvent).to.not.be.undefined;
      
      expect(queryEvent?.args?.user).to.equal(await user1.getAddress());
      expect(queryEvent?.args?.epsilon).to.equal(epsilon);
      expect(queryEvent?.args?.delta).to.equal(delta);
      
      const stats = await differentialPrivacy.getStatistics();
      expect(stats.totalQueries_).to.equal(1);
      expect(stats.totalLaplaceNoise_).to.be.gt(0);
    });

    it("Should fail with invalid epsilon", async function () {
      const originalValue = 100;
      const lowEpsilon = 0; // Below minimum
      const highEpsilon = 2000; // Above maximum
      
      await expect(differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        originalValue,
        lowEpsilon,
        5
      )).to.be.revertedWith("Invalid epsilon");
      
      await expect(differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        originalValue,
        highEpsilon,
        5
      )).to.be.revertedWith("Invalid epsilon");
    });

    it("Should fail with invalid delta", async function () {
      const originalValue = 100;
      const lowDelta = 0; // Below minimum
      const highDelta = 2000; // Above maximum
      
      await expect(differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        originalValue,
        10,
        lowDelta
      )).to.be.revertedWith("Invalid delta");
      
      await expect(differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        originalValue,
        10,
        highDelta
      )).to.be.revertedWith("Invalid delta");
    });

    it("Should fail with invalid original value", async function () {
      await expect(differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        0, // Invalid value
        10,
        5
      )).to.be.revertedWith("Invalid original value");
    });

    it("Should fail without initialized privacy budget", async function () {
      await expect(differentialPrivacy.connect(addr1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      )).to.be.revertedWith("Privacy budget not initialized");
    });

    it("Should consume privacy budget correctly", async function () {
      const originalValue = 100;
      const epsilon = 10;
      const delta = 5;
      
      const initialBudget = await differentialPrivacy.getPrivacyBudget(await user1.getAddress());
      
      await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        originalValue,
        epsilon,
        delta
      );
      
      const finalBudget = await differentialPrivacy.getPrivacyBudget(await user1.getAddress());
      expect(finalBudget.usedBudget).to.be.gt(initialBudget.usedBudget);
      expect(finalBudget.remainingBudget).to.be.lt(initialBudget.remainingBudget);
    });
  });

  describe("Query Information", function () {
    let queryId: string;

    beforeEach(async function () {
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user1.getAddress());
      
      const tx = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      );
      
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "DifferentialPrivacyQuery");
      queryId = event?.args?.queryId;
    });

    it("Should return correct query information", async function () {
      const query = await differentialPrivacy.getDifferentialQuery(queryId);
      
      expect(query.queryId_).to.equal(queryId);
      expect(query.user).to.equal(await user1.getAddress());
      expect(query.originalValue).to.equal(100);
      expect(query.epsilon).to.equal(10);
      expect(query.delta).to.equal(5);
      expect(query.isProcessed).to.be.false;
    });

    it("Should add noise to original value", async function () {
      const query = await differentialPrivacy.getDifferentialQuery(queryId);
      
      expect(query.noisyValue).to.be.gte(query.originalValue);
      expect(query.noisyValue).to.be.gt(query.originalValue); // Should have noise added
    });
  });

  describe("Laplace Noise Generation", function () {
    it("Should generate different noise for different queries", async function () {
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user1.getAddress());
      
      const query1 = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      );
      
      const query2 = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      );
      
      const query1Info = await differentialPrivacy.getDifferentialQuery(query1);
      const query2Info = await differentialPrivacy.getDifferentialQuery(query2);
      
      // Noise should be different due to randomness
      expect(query1Info.noisyValue).to.not.equal(query2Info.noisyValue);
    });

    it("Should generate appropriate noise based on epsilon", async function () {
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user1.getAddress());
      
      // Lower epsilon should generate more noise (more private)
      const lowEpsilonQuery = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        1, // Low epsilon
        5
      );
      
      const highEpsilonQuery = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        100, // High epsilon
        5
      );
      
      const lowEpsilonInfo = await differentialPrivacy.getDifferentialQuery(lowEpsilonQuery);
      const highEpsilonInfo = await differentialPrivacy.getDifferentialQuery(highEpsilonQuery);
      
      const lowEpsilonNoise = lowEpsilonInfo.noisyValue - lowEpsilonInfo.originalValue;
      const highEpsilonNoise = highEpsilonInfo.noisyValue - highEpsilonInfo.originalValue;
      
      // Lower epsilon should generally produce more noise
      expect(lowEpsilonNoise).to.be.gte(highEpsilonNoise);
    });
  });

  describe("Privacy Budget Management", function () {
    beforeEach(async function () {
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user1.getAddress());
    });

    it("Should track privacy budget usage", async function () {
      const initialBudget = await differentialPrivacy.getPrivacyBudget(await user1.getAddress());
      
      await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      );
      
      const finalBudget = await differentialPrivacy.getPrivacyBudget(await user1.getAddress());
      
      expect(finalBudget.usedBudget).to.be.gt(initialBudget.usedBudget);
      expect(finalBudget.remainingBudget).to.be.lt(initialBudget.remainingBudget);
    });

    it("Should fail when privacy budget is exhausted", async function () {
      // Create many queries to exhaust budget
      for (let i = 0; i < 50; i++) {
        try {
          await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
            100,
            10,
            5
          );
        } catch (error) {
          // Expected to fail when budget is exhausted
          break;
        }
      }
      
      // Should eventually fail due to insufficient budget
      await expect(differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      )).to.be.revertedWith("Insufficient privacy budget");
    });
  });

  describe("Epsilon-Delta Guarantees", function () {
    beforeEach(async function () {
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user1.getAddress());
    });

    it("Should verify epsilon-delta privacy guarantees", async function () {
      const tx = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      );
      
      const receipt = await tx.wait();
      const guaranteeEvent = receipt.events?.find(e => e.event === "EpsilonDeltaGuarantee");
      
      expect(guaranteeEvent).to.not.be.undefined;
      expect(guaranteeEvent?.args?.epsilon).to.equal(10);
      expect(guaranteeEvent?.args?.delta).to.equal(5);
      expect(guaranteeEvent?.args?.guaranteeMet).to.be.true;
    });

    it("Should provide stronger privacy with lower epsilon", async function () {
      const lowEpsilonQuery = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        1, // Very low epsilon for strong privacy
        1
      );
      
      const highEpsilonQuery = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        100, // High epsilon for weak privacy
        100
      );
      
      const lowEpsilonInfo = await differentialPrivacy.getDifferentialQuery(lowEpsilonQuery);
      const highEpsilonInfo = await differentialPrivacy.getDifferentialQuery(highEpsilonQuery);
      
      // Lower epsilon should produce more noise (stronger privacy)
      const lowEpsilonNoise = lowEpsilonInfo.noisyValue - lowEpsilonInfo.originalValue;
      const highEpsilonNoise = highEpsilonInfo.noisyValue - highEpsilonInfo.originalValue;
      
      expect(lowEpsilonNoise).to.be.gte(highEpsilonNoise);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      await differentialPrivacy.connect(owner).pause();
      expect(await differentialPrivacy.paused()).to.be.true;
      
      await differentialPrivacy.connect(owner).unpause();
      expect(await differentialPrivacy.paused()).to.be.false;
    });

    it("Should fail emergency functions for non-owner", async function () {
      await expect(differentialPrivacy.connect(user1).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(differentialPrivacy.connect(user1).unpause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full differential privacy workflow", async function () {
      // Initialize privacy budgets for multiple users
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user1.getAddress());
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user2.getAddress());
      await differentialPrivacy.connect(owner).initializePrivacyBudget(await user3.getAddress());
      
      // Create multiple differential privacy queries
      const query1 = await differentialPrivacy.connect(user1).createDifferentialPrivacyQuery(
        100,
        10,
        5
      );
      
      const query2 = await differentialPrivacy.connect(user2).createDifferentialPrivacyQuery(
        200,
        5,
        2
      );
      
      const query3 = await differentialPrivacy.connect(user3).createDifferentialPrivacyQuery(
        150,
        20,
        10
      );
      
      // Verify all queries were created successfully
      const query1Info = await differentialPrivacy.getDifferentialQuery(query1);
      const query2Info = await differentialPrivacy.getDifferentialQuery(query2);
      const query3Info = await differentialPrivacy.getDifferentialQuery(query3);
      
      expect(query1Info.user).to.equal(await user1.getAddress());
      expect(query2Info.user).to.equal(await user2.getAddress());
      expect(query3Info.user).to.equal(await user3.getAddress());
      
      // Verify noise was added to all queries
      expect(query1Info.noisyValue).to.be.gt(query1Info.originalValue);
      expect(query2Info.noisyValue).to.be.gt(query2Info.originalValue);
      expect(query3Info.noisyValue).to.be.gt(query3Info.originalValue);
      
      // Verify privacy budgets were consumed
      const budget1 = await differentialPrivacy.getPrivacyBudget(await user1.getAddress());
      const budget2 = await differentialPrivacy.getPrivacyBudget(await user2.getAddress());
      const budget3 = await differentialPrivacy.getPrivacyBudget(await user3.getAddress());
      
      expect(budget1.usedBudget).to.be.gt(0);
      expect(budget2.usedBudget).to.be.gt(0);
      expect(budget3.usedBudget).to.be.gt(0);
      
      // Verify final statistics
      const stats = await differentialPrivacy.getStatistics();
      expect(stats.totalQueries_).to.equal(3);
      expect(stats.totalPrivacyBudgets_).to.equal(3);
      expect(stats.totalLaplaceNoise_).to.be.gt(0);
    });
  });
}); 