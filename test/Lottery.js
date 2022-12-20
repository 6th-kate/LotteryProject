const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Lottery", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy100ticketsLotteryFixture() {
    const ticketsNumber = 100;
    const ticketPrice = 20;

    // Contracts are deployed using the first signer/account by default
    const [owner, acc1, acc2, acc3, acc4] = await ethers.getSigners();

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(ticketsNumber, ticketPrice);

    return { lottery, ticketsNumber, ticketPrice, owner, acc1, acc2, acc3, acc4 };
  }

  describe("Deployment", function () {
    it("Should set the right ticketsNumber", async function () {
      const { lottery, ticketsNumber } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.ticketsNumber()).to.equal(ticketsNumber);
    });

    it("Should set the right maxTicketsNumber", async function () {
      const { lottery, ticketsNumber } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.maxTicketsNumber()).to.equal(ticketsNumber);
    });

    it("Should set the right ticketPrice", async function () {
      const { lottery, ticketPrice } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.ticketPrice()).to.equal(ticketPrice);
    });

    it("Should set the right owner", async function () {
      const { lottery, owner } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.owner()).to.equal(owner.address);
    });

    it("Should set the right playersNumber", async function () {
      const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.playersNumber()).to.equal(0);
    });

    it("Should set the right revealedNumber", async function () {
      const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.revealedNumber()).to.equal(0);
    });

    it("Should set the right randomNumber", async function () {
      const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.randomNumber()).to.equal(0);
    });

    it("Should set the right commitsStart", async function () {
      const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.commitsStart()).to.equal(0);
    });

    it("Should set the right revealsStart", async function () {
      const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);

      expect(await lottery.revealsStart()).to.equal(0);
    });
  });

  describe("Starts", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called from another account", async function () {
        const { lottery, acc1 } = await loadFixture(deploy100ticketsLotteryFixture);

        await expect(lottery.connect(acc1).startLottery()).to.be.revertedWith("Not enough access rights");
      });

      it("Shouldn't fail if the owner calls it", async function () {
        const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);

        await expect(lottery.startLottery()).not.to.be.reverted;
      });

      it("Should revert with the right error if it was already started", async function () {
        const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery()

        await expect(lottery.startLottery()).to.be.revertedWith("Lottery is still in process");
      });
    });

    describe("Events", function () {
      it("Should emit an event on lottery start", async function () {
        const { lottery, ticketsNumber, ticketPrice } = await loadFixture(deploy100ticketsLotteryFixture);

        await expect(lottery.startLottery())
          .to.emit(lottery, "LotteryStarted")
          .withArgs(ticketsNumber, ticketPrice);
      });
    });

    describe("Starts", function () {
      it("Should set the lottery time parameters", async function () {
        const { lottery } = await loadFixture(deploy100ticketsLotteryFixture);

        lottery.startLottery();

        expect(await lottery.commitsStart()).not.to.equal(0);
        expect(await lottery.revealsStart()).not.to.equal(0);
      });
    });
  });

  
});
