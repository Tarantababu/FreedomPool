const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("FreedomPool", function () {
  async function deployFixture() {
    const [owner, user1, user2, feeRecipient] = await ethers.getSigners();

    // Deploy mock USDC (6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    // We'll use a simple mock for testing
    const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    await usdc.waitForDeployment();

    // Mint USDC to users
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("50000", 6));

    // Deploy FreedomToken
    const FreedomToken = await ethers.getContractFactory("FreedomToken");
    const fdm = await FreedomToken.deploy(owner.address);
    await fdm.waitForDeployment();

    // Deploy FreedomPool
    const FreedomPool = await ethers.getContractFactory("FreedomPool");
    const pool = await FreedomPool.deploy(
      await usdc.getAddress(),
      feeRecipient.address,
      owner.address
    );
    await pool.waitForDeployment();

    // Wire FDM token
    await pool.setFreedomToken(await fdm.getAddress());
    await fdm.addMinter(await pool.getAddress());

    return { pool, usdc, fdm, owner, user1, user2, feeRecipient };
  }

  describe("Deployment", function () {
    it("Should set correct initial state", async function () {
      const { pool } = await loadFixture(deployFixture);
      expect(await pool.currentEpoch()).to.equal(1);
      expect(await pool.totalDeposits()).to.equal(0);
    });

    it("Should have correct pool configurations", async function () {
      const { pool } = await loadFixture(deployFixture);

      const [min0, max0, mult0] = await pool.getPoolInfo(0);
      expect(min0).to.equal(ethers.parseUnits("10", 6));
      expect(max0).to.equal(ethers.parseUnits("500", 6));

      const [min1, max1, mult1] = await pool.getPoolInfo(1);
      expect(min1).to.equal(ethers.parseUnits("500", 6));
      expect(max1).to.equal(ethers.parseUnits("5000", 6));

      const [min2, max2, mult2] = await pool.getPoolInfo(2);
      expect(min2).to.equal(ethers.parseUnits("5000", 6));
      expect(max2).to.equal(ethers.parseUnits("100000", 6));
    });
  });

  describe("Deposits", function () {
    it("Should allow deposit into Koruma pool", async function () {
      const { pool, usdc, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("100", 6);

      await usdc.connect(user1).approve(await pool.getAddress(), amount);
      await expect(pool.connect(user1).deposit(0, amount))
        .to.emit(pool, "Deposited")
        .withArgs(user1.address, 0, amount);

      const [tier, amt, , , active] = await pool.getUserPosition(user1.address);
      expect(tier).to.equal(0);
      expect(amt).to.equal(amount);
      expect(active).to.be.true;
    });

    it("Should reject deposit below minimum", async function () {
      const { pool, usdc, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("5", 6); // Below 10 USDC min

      await usdc.connect(user1).approve(await pool.getAddress(), amount);
      await expect(pool.connect(user1).deposit(0, amount))
        .to.be.revertedWith("FreedomPool: below minimum");
    });

    it("Should reject deposit above maximum", async function () {
      const { pool, usdc, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("600", 6); // Above 500 USDC max for Koruma

      await usdc.connect(user1).approve(await pool.getAddress(), amount);
      await expect(pool.connect(user1).deposit(0, amount))
        .to.be.revertedWith("FreedomPool: above maximum");
    });

    it("Should reject duplicate deposit", async function () {
      const { pool, usdc, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("100", 6);

      await usdc.connect(user1).approve(await pool.getAddress(), amount * 2n);
      await pool.connect(user1).deposit(0, amount);

      await expect(pool.connect(user1).deposit(0, amount))
        .to.be.revertedWith("FreedomPool: already has position");
    });
  });

  describe("Withdrawals", function () {
    it("Should apply early exit penalty", async function () {
      const { pool, usdc, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("100", 6);

      await usdc.connect(user1).approve(await pool.getAddress(), amount);
      await pool.connect(user1).deposit(0, amount);

      const balBefore = await usdc.balanceOf(user1.address);
      await pool.connect(user1).withdraw();
      const balAfter = await usdc.balanceOf(user1.address);

      // Should receive 95 USDC (100 - 5% penalty)
      const received = balAfter - balBefore;
      expect(received).to.equal(ethers.parseUnits("95", 6));
    });

    it("Should not apply penalty after min duration", async function () {
      const { pool, usdc, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("100", 6);

      await usdc.connect(user1).approve(await pool.getAddress(), amount);
      await pool.connect(user1).deposit(0, amount);

      // Fast forward 7 days
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      const balBefore = await usdc.balanceOf(user1.address);
      await pool.connect(user1).withdraw();
      const balAfter = await usdc.balanceOf(user1.address);

      // Should receive full 100 USDC
      const received = balAfter - balBefore;
      expect(received).to.equal(amount);
    });
  });

  describe("Protocol Stats", function () {
    it("Should track total deposits correctly", async function () {
      const { pool, usdc, user1, user2 } = await loadFixture(deployFixture);

      await usdc.connect(user1).approve(await pool.getAddress(), ethers.parseUnits("100", 6));
      await pool.connect(user1).deposit(0, ethers.parseUnits("100", 6));

      await usdc.connect(user2).approve(await pool.getAddress(), ethers.parseUnits("1000", 6));
      await pool.connect(user2).deposit(1, ethers.parseUnits("1000", 6));

      const [totalDep, , , , , count] = await pool.getProtocolStats();
      expect(totalDep).to.equal(ethers.parseUnits("1100", 6));
      expect(count).to.equal(2);
    });
  });
});
