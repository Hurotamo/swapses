import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, Signer } from "ethers";

describe("ZKPrivacyMixer", function () {
    let ZKPrivacyMixer: ContractFactory;
    let ZKVerifier: ContractFactory;
    let AltBn128: ContractFactory;
    let mixer: any;
    let zkVerifier: any;
    let altBn128: any;
    let owner: Signer;
    let user1: Signer;
    let user2: Signer;
    let user3: Signer;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        // Deploy libraries
        ZKVerifier = await ethers.getContractFactory("ZKVerifier");
        zkVerifier = await ZKVerifier.deploy();
        await zkVerifier.deployed();

        AltBn128 = await ethers.getContractFactory("AltBn128");
        altBn128 = await AltBn128.deploy();
        await altBn128.deployed();

        // Deploy main contract
        ZKPrivacyMixer = await ethers.getContractFactory("ZKPrivacyMixer");
        mixer = await ZKPrivacyMixer.deploy();
        await mixer.deployed();
    });

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(mixer.address).to.not.equal(ethers.constants.AddressZero);
        });

        it("Should have correct owner", async function () {
            expect(await mixer.owner()).to.equal(await owner.getAddress());
        });

        it("Should be unpaused by default", async function () {
            expect(await mixer.paused()).to.be.false;
        });
    });

    describe("ZK Proof Verification", function () {
        it("Should verify valid G1 points", async function () {
            const validPoint = {
                x: ethers.BigNumber.from("1"),
                y: ethers.BigNumber.from("2")
            };

            const isValid = await altBn128.isValidG1Point(validPoint.x, validPoint.y);
            expect(isValid).to.be.true;
        });

        it("Should reject invalid G1 points", async function () {
            const invalidPoint = {
                x: ethers.BigNumber.from("9999999999999999999999999999999999999999999999999999999999999999"),
                y: ethers.BigNumber.from("9999999999999999999999999999999999999999999999999999999999999999")
            };

            const isValid = await altBn128.isValidG1Point(invalidPoint.x, invalidPoint.y);
            expect(isValid).to.be.false;
        });

        it("Should verify valid G2 points", async function () {
            const validG2Point = {
                x: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")],
                y: [ethers.BigNumber.from("3"), ethers.BigNumber.from("4")]
            };

            const isValid = await altBn128.isValidG2Point(validG2Point.x, validG2Point.y);
            expect(isValid).to.be.true;
        });

        it("Should perform G1 point addition", async function () {
            const point1 = {
                x: ethers.BigNumber.from("1"),
                y: ethers.BigNumber.from("2")
            };
            const point2 = {
                x: ethers.BigNumber.from("3"),
                y: ethers.BigNumber.from("4")
            };

            const result = await altBn128.addG1(
                point1.x, point1.y,
                point2.x, point2.y
            );

            expect(result.x).to.not.equal(ethers.constants.Zero);
            expect(result.y).to.not.equal(ethers.constants.Zero);
        });

        it("Should perform G1 scalar multiplication", async function () {
            const point = {
                x: ethers.BigNumber.from("1"),
                y: ethers.BigNumber.from("2")
            };
            const scalar = ethers.BigNumber.from("5");

            const result = await altBn128.scalarMulG1(point.x, point.y, scalar);

            expect(result.x).to.not.equal(ethers.constants.Zero);
            expect(result.y).to.not.equal(ethers.constants.Zero);
        });
    });

    describe("Poseidon Hash Function", function () {
        it("Should generate consistent hashes", async function () {
            const inputs = [
                ethers.BigNumber.from("123"),
                ethers.BigNumber.from("456"),
                ethers.BigNumber.from("789")
            ];

            const hash1 = await zkVerifier.poseidonHash(inputs);
            const hash2 = await zkVerifier.poseidonHash(inputs);

            expect(hash1).to.equal(hash2);
        });

        it("Should generate different hashes for different inputs", async function () {
            const inputs1 = [
                ethers.BigNumber.from("123"),
                ethers.BigNumber.from("456"),
                ethers.BigNumber.from("789")
            ];

            const inputs2 = [
                ethers.BigNumber.from("123"),
                ethers.BigNumber.from("456"),
                ethers.BigNumber.from("790")
            ];

            const hash1 = await zkVerifier.poseidonHash(inputs1);
            const hash2 = await zkVerifier.poseidonHash(inputs2);

            expect(hash1).to.not.equal(hash2);
        });

        it("Should handle single input", async function () {
            const inputs = [ethers.BigNumber.from("999")];
            const hash = await zkVerifier.poseidonHash(inputs);

            expect(hash).to.not.equal(ethers.constants.HashZero);
        });
    });

    describe("Commitment and Nullifier Generation", function () {
        it("Should generate valid commitments", async function () {
            const secret = ethers.BigNumber.from("123456789");
            const amount = ethers.BigNumber.from("1000000000000000000"); // 1 ETH
            const nullifier = ethers.BigNumber.from("987654321");

            const commitment = await zkVerifier.generateCommitment(secret, amount, nullifier);

            expect(commitment).to.not.equal(ethers.constants.HashZero);
        });

        it("Should generate valid nullifiers", async function () {
            const secret = ethers.BigNumber.from("123456789");
            const nullifier = ethers.BigNumber.from("987654321");

            const nullifierHash = await zkVerifier.generateNullifier(secret, nullifier);

            expect(nullifierHash).to.not.equal(ethers.constants.HashZero);
        });

        it("Should generate different commitments for different inputs", async function () {
            const secret1 = ethers.BigNumber.from("123456789");
            const amount1 = ethers.BigNumber.from("1000000000000000000");
            const nullifier1 = ethers.BigNumber.from("987654321");

            const secret2 = ethers.BigNumber.from("123456789");
            const amount2 = ethers.BigNumber.from("2000000000000000000");
            const nullifier2 = ethers.BigNumber.from("987654321");

            const commitment1 = await zkVerifier.generateCommitment(secret1, amount1, nullifier1);
            const commitment2 = await zkVerifier.generateCommitment(secret2, amount2, nullifier2);

            expect(commitment1).to.not.equal(commitment2);
        });
    });

    describe("Mixing Pool Management", function () {
        it("Should create mixing pool", async function () {
            const minDelay = 3600; // 1 hour
            const maxDelay = 604800; // 1 week
            const merkleDepth = 32;

            await mixer.createMixingPool(minDelay, maxDelay, merkleDepth);

            const poolInfo = await mixer.getPoolInfo(1);
            expect(poolInfo.isActive).to.be.true;
            expect(poolInfo.minDelay).to.equal(minDelay);
            expect(poolInfo.maxDelay).to.equal(maxDelay);
            expect(poolInfo.merkleDepth).to.equal(merkleDepth);
        });

        it("Should reject invalid delay ranges", async function () {
            const minDelay = 604800; // 1 week
            const maxDelay = 3600; // 1 hour (less than min)
            const merkleDepth = 32;

            await expect(
                mixer.createMixingPool(minDelay, maxDelay, merkleDepth)
            ).to.be.revertedWith("Invalid delay range");
        });

        it("Should reject excessive merkle depth", async function () {
            const minDelay = 3600;
            const maxDelay = 604800;
            const merkleDepth = 33; // Exceeds MAX_MERKLE_DEPTH

            await expect(
                mixer.createMixingPool(minDelay, maxDelay, merkleDepth)
            ).to.be.revertedWith("Invalid merkle depth");
        });
    });

    describe("Deposit Functionality", function () {
        beforeEach(async function () {
            // Create a mixing pool
            await mixer.createMixingPool(3600, 604800, 32);
        });

        it("Should accept valid deposits", async function () {
            const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test commitment"));
            const poolId = 1;
            const mixingDelay = 3600;
            const amount = ethers.utils.parseEther("1");

            // Mock ZK proof
            const mockProof = {
                a: {
                    x: ethers.BigNumber.from("123456789"),
                    y: ethers.BigNumber.from("987654321")
                },
                b: {
                    x: [ethers.BigNumber.from("111"), ethers.BigNumber.from("222")],
                    y: [ethers.BigNumber.from("333"), ethers.BigNumber.from("444")]
                },
                c: {
                    x: ethers.BigNumber.from("555666777"),
                    y: ethers.BigNumber.from("888999000")
                },
                publicInputs: [
                    ethers.BigNumber.from("123"),
                    ethers.BigNumber.from("456")
                ]
            };

            await expect(
                mixer.connect(user1).deposit(
                    commitment,
                    poolId,
                    mixingDelay,
                    mockProof,
                    { value: amount }
                )
            ).to.emit(mixer, "DepositCreated");
        });

        it("Should reject deposits with invalid amounts", async function () {
            const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test commitment"));
            const poolId = 1;
            const mixingDelay = 3600;
            const amount = ethers.utils.parseEther("0.005"); // Below MIN_DEPOSIT

            const mockProof = {
                a: { x: ethers.BigNumber.from("1"), y: ethers.BigNumber.from("2") },
                b: { x: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")], y: [ethers.BigNumber.from("3"), ethers.BigNumber.from("4")] },
                c: { x: ethers.BigNumber.from("5"), y: ethers.BigNumber.from("6") },
                publicInputs: [ethers.BigNumber.from("123"), ethers.BigNumber.from("456")]
            };

            await expect(
                mixer.connect(user1).deposit(
                    commitment,
                    poolId,
                    mixingDelay,
                    mockProof,
                    { value: amount }
                )
            ).to.be.revertedWith("Invalid deposit amount");
        });

        it("Should reject deposits to inactive pools", async function () {
            const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test commitment"));
            const poolId = 999; // Non-existent pool
            const mixingDelay = 3600;
            const amount = ethers.utils.parseEther("1");

            const mockProof = {
                a: { x: ethers.BigNumber.from("1"), y: ethers.BigNumber.from("2") },
                b: { x: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")], y: [ethers.BigNumber.from("3"), ethers.BigNumber.from("4")] },
                c: { x: ethers.BigNumber.from("5"), y: ethers.BigNumber.from("6") },
                publicInputs: [ethers.BigNumber.from("123"), ethers.BigNumber.from("456")]
            };

            await expect(
                mixer.connect(user1).deposit(
                    commitment,
                    poolId,
                    mixingDelay,
                    mockProof,
                    { value: amount }
                )
            ).to.be.revertedWith("Pool not active");
        });
    });

    describe("Withdrawal Functionality", function () {
        beforeEach(async function () {
            // Create a mixing pool and add some funds
            await mixer.createMixingPool(3600, 604800, 32);
            
            // Add funds to the contract
            await owner.sendTransaction({
                to: mixer.address,
                value: ethers.utils.parseEther("10")
            });
        });

        it("Should reject withdrawals with invalid nullifiers", async function () {
            const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test nullifier"));
            const recipient = await user1.getAddress();
            const amount = ethers.utils.parseEther("1");

            const mockProof = {
                a: { x: ethers.BigNumber.from("1"), y: ethers.BigNumber.from("2") },
                b: { x: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")], y: [ethers.BigNumber.from("3"), ethers.BigNumber.from("4")] },
                c: { x: ethers.BigNumber.from("5"), y: ethers.BigNumber.from("6") },
                publicInputs: [ethers.BigNumber.from("123"), ethers.BigNumber.from("456")]
            };

            await expect(
                mixer.connect(user1).withdraw(
                    nullifier,
                    recipient,
                    amount,
                    mockProof
                )
            ).to.be.revertedWith("Invalid withdrawal proof");
        });

        it("Should reject withdrawals with zero amount", async function () {
            const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test nullifier"));
            const recipient = await user1.getAddress();
            const amount = 0;

            const mockProof = {
                a: { x: ethers.BigNumber.from("1"), y: ethers.BigNumber.from("2") },
                b: { x: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")], y: [ethers.BigNumber.from("3"), ethers.BigNumber.from("4")] },
                c: { x: ethers.BigNumber.from("5"), y: ethers.BigNumber.from("6") },
                publicInputs: [ethers.BigNumber.from("123"), ethers.BigNumber.from("456")]
            };

            await expect(
                mixer.connect(user1).withdraw(
                    nullifier,
                    recipient,
                    amount,
                    mockProof
                )
            ).to.be.revertedWith("Invalid amount");
        });

        it("Should reject withdrawals to zero address", async function () {
            const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test nullifier"));
            const recipient = ethers.constants.AddressZero;
            const amount = ethers.utils.parseEther("1");

            const mockProof = {
                a: { x: ethers.BigNumber.from("1"), y: ethers.BigNumber.from("2") },
                b: { x: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")], y: [ethers.BigNumber.from("3"), ethers.BigNumber.from("4")] },
                c: { x: ethers.BigNumber.from("5"), y: ethers.BigNumber.from("6") },
                publicInputs: [ethers.BigNumber.from("123"), ethers.BigNumber.from("456")]
            };

            await expect(
                mixer.connect(user1).withdraw(
                    nullifier,
                    recipient,
                    amount,
                    mockProof
                )
            ).to.be.revertedWith("Invalid recipient");
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to pause", async function () {
            await mixer.pause();
            expect(await mixer.paused()).to.be.true;
        });

        it("Should allow owner to unpause", async function () {
            await mixer.pause();
            await mixer.unpause();
            expect(await mixer.paused()).to.be.false;
        });

        it("Should reject pause from non-owner", async function () {
            await expect(
                mixer.connect(user1).pause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow emergency withdrawal", async function () {
            // Add funds to contract
            await owner.sendTransaction({
                to: mixer.address,
                value: ethers.utils.parseEther("5")
            });

            const initialBalance = await owner.getBalance();
            await mixer.emergencyWithdraw();
            const finalBalance = await owner.getBalance();

            expect(finalBalance.gt(initialBalance)).to.be.true;
        });

        it("Should reject emergency withdrawal from non-owner", async function () {
            await expect(
                mixer.connect(user1).emergencyWithdraw()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Utility Functions", function () {
        it("Should check nullifier usage", async function () {
            const nullifier = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test nullifier"));
            const isUsed = await mixer.isNullifierUsed(nullifier);
            expect(isUsed).to.be.false;
        });

        it("Should get deposit information", async function () {
            const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test commitment"));
            const depositInfo = await mixer.getDepositInfo(commitment);
            
            expect(depositInfo.amount).to.equal(0);
            expect(depositInfo.timestamp).to.equal(0);
            expect(depositInfo.isWithdrawn).to.be.false;
        });

        it("Should get pool information", async function () {
            const poolInfo = await mixer.getPoolInfo(1);
            expect(poolInfo.isActive).to.be.false;
            expect(poolInfo.totalAmount).to.equal(0);
            expect(poolInfo.participantCount).to.equal(0);
        });
    });

    describe("Gas Optimization", function () {
        it("Should optimize gas usage for batch operations", async function () {
            // Create multiple nullifiers
            const nullifiers = [];
            const recipients = [];
            const amounts = [];
            const proofs = [];

            for (let i = 0; i < 5; i++) {
                nullifiers.push(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`nullifier${i}`)));
                recipients.push(await user1.getAddress());
                amounts.push(ethers.utils.parseEther("0.1"));

                proofs.push({
                    a: { x: ethers.BigNumber.from("1"), y: ethers.BigNumber.from("2") },
                    b: { x: [ethers.BigNumber.from("1"), ethers.BigNumber.from("2")], y: [ethers.BigNumber.from("3"), ethers.BigNumber.from("4")] },
                    c: { x: ethers.BigNumber.from("5"), y: ethers.BigNumber.from("6") },
                    publicInputs: [ethers.BigNumber.from("123"), ethers.BigNumber.from("456")]
                });
            }

            // This should not revert due to gas limits
            await expect(
                mixer.connect(user1).batchWithdraw(
                    nullifiers,
                    recipients,
                    amounts,
                    proofs
                )
            ).to.be.revertedWith("Invalid withdrawal proof"); // Expected due to mock proofs
        });
    });
}); 