const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { keccak256 } = require('keccak256')
const Web3 = require('web3');
const web3 = new Web3();

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

  async function hashNumber(num, usr) {
    addr = await usr.getAddress();
    const encoded = web3.eth.abi.encodeParameters(['uint256', 'address'], [num, addr]);
    const hash = web3.utils.sha3(encoded, {encoding: 'hex'});
    return hash;
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

  describe("Buy tickets", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called when lottery is not started", async function() {
        const { lottery, acc1 } = await loadFixture(deploy100ticketsLotteryFixture);
        await expect(lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), 100, { value: 100*20 })).to.be.revertedWith(
          "Not in commmits phase"
        );
      });

      it("Should revert with the right error if called when commits phase ended", async function() {
        const { lottery , acc1 } = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();

        const TWENTY_DAYS_IN_SECS = 20 * 24 * 60 * 60;
        const lockTime = (await time.latest()) + TWENTY_DAYS_IN_SECS;
        await time.increaseTo(lockTime);

        await expect(lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), 100, { value: 100*20 })).to.be.revertedWith("Not in commmits phase");
      });

      it("Should revert with the right error if called from owner", async function () {
        const { lottery, owner } = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();

        await expect(lottery.buyTickets(await hashNumber(23456, owner), 100, { value: 100*20 })).to.be.revertedWith(
          "Owner cannot buy tickets"
        );
      });

      it("Shouldn't fail if not registered player calls it with positive tickets number", async function () {
        const { lottery, acc1 } = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();

        await expect(lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), 1, { value: 1*20 })).not.to.be.reverted;
      });

      it("Should revert with the right error if not registered player calls it with negative tickets number", async function () {
        const { lottery, acc1 } = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();

        await expect(lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), 0, { value: 1*20 })).to.be.revertedWith(
          "Tickets number cannot be equal zero"
        );
      });
      
      it("Should revert with the right error if the same user tries to buy tickets", async function() {
        const { lottery, acc1} = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();
        lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), 99, { value: 99*20 })

        await expect(lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), 1, { value: 1*20 })).to.be.revertedWith(
          "Tickets already bought by this address"
        );
      });

      it("Should revert with the right error if no tickets are left", async function() {
        const { lottery, acc1, acc2} = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();
        lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), 100, { value: 100*20 })

        await expect(lottery.connect(acc2).buyTickets(await hashNumber(23456, acc2), 1, { value: 1*20 })).to.be.revertedWith(
          "All tickets sold, wait for the next lottery"
        );
      });
    });

    describe("Events", function () {
      it("Should emit an event on tickets purchase", async function () {
        const { lottery, acc1, ticketPrice} = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();
        const actualTicketsToBuyNumber = 1;
        const hashedNumber = await hashNumber(23456, acc1);

        await expect(lottery.connect(acc1).buyTickets(hashedNumber, actualTicketsToBuyNumber, { value: actualTicketsToBuyNumber*ticketPrice }))
          .to.emit(lottery, "BoughtTickets")
          .withArgs(await acc1.getAddress(), actualTicketsToBuyNumber, actualTicketsToBuyNumber * ticketPrice, hashedNumber, anyValue);
      });
    });

    describe("Purchases", function () {
      it("Should return the excess money amount", async function () {
        const { lottery, ticketPrice, acc1} = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();
        const actualTicketsToBuyNumber = 1;
        const actualCost = actualTicketsToBuyNumber * ticketPrice;
        const moneyToSend = (actualTicketsToBuyNumber + 5) * ticketPrice;
        const hashedNumber = await hashNumber(23456, acc1);

        await expect(lottery.connect(acc1).buyTickets(hashedNumber, actualTicketsToBuyNumber, { value: moneyToSend }))
        .to.changeEtherBalances(
          [acc1, lottery],
          [-actualCost, actualCost]
        );
      });
      
      it("Should decrease left tickets number", async function () {
        const { lottery, acc1, ticketPrice } = await loadFixture(deploy100ticketsLotteryFixture);
        lottery.startLottery();
        const initialTicketsNumber = await lottery.ticketsNumber();
        const actualTicketsToBuyNumber = 4;

        await lottery.connect(acc1).buyTickets(await hashNumber(23456, acc1), actualTicketsToBuyNumber,
         { value: actualTicketsToBuyNumber * ticketPrice + 1}
        );

        expect(await lottery.ticketsNumber()).to.be.equal(initialTicketsNumber - actualTicketsToBuyNumber);
      });
    });
  });
});
