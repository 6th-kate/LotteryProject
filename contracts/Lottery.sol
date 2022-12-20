// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Lottery {
    address payable public owner;                  // Contract owner
    uint public ticketsNumber;                     // Current tickets number
    uint public maxTicketsNumber;                  // Max tickets number
    uint public ticketPrice;                       // Price per one ticket

    uint constant public COMMIT_TIMEOUT = 20 days; // Commits phase max length
    uint constant public REVEAL_TIMEOUT = 20 days; // Reveals phase max length
    uint public commitsStart;                     // Commits phase start moment
    uint public revealsStart;                     // Reveals phase start moment

    uint public randomNumber;                      // The random

    struct Commit {
        uint ticketsNumber;
        uint64 commitBlock;
        bytes32 hashedRandom;
        bool revealed;
    }

    // A pattern, allowing to iterate on players and their commits mapping.
    address[] private _players;
    mapping (address => Commit) private _playersCommits;

    // All players number.
    uint public playersNumber;
    // Number of players who revealed their number.
    uint public revealedNumber;

    constructor(uint _ticketsNumber, uint _ticketPrice) {
        owner = payable(msg.sender);
        ticketsNumber = _ticketsNumber;
        maxTicketsNumber = _ticketsNumber;
        ticketPrice = _ticketPrice;
        playersNumber = 0;
        revealedNumber = 0;
        randomNumber = 0;
        commitsStart = 0;
        revealsStart = 0;
    }

    modifier OnlyOwner {
        require(msg.sender == owner, "Not enough access rights");
        _;
    }

    modifier NotOwnerNorRegisteredPlayer {                              // Not the owner nor player
        require(msg.sender != owner, "Owner cannot buy tickets");
        require(_playersCommits[msg.sender].ticketsNumber == 0, "Tickets already bought by this address");
        _;
    }

    modifier OnlyCommittedPlayer {                                      // Only player that has alreade bought tickets
        require(_playersCommits[msg.sender].ticketsNumber != 0, "No tickets bought by this address");
        _;
    }

    modifier CommitPhase {                                              // Commits Phase active and there are tickets left.
        require(commitsStart != 0 && block.timestamp < commitsStart + COMMIT_TIMEOUT, "Not in commmits phase");                 
        require(ticketsNumber > 0,"All tickets sold, wait for the next lottery");
        _;
    }

    modifier RevealPhase {
        require(_playersCommits[msg.sender].commitBlock !=              // Commit and reveal cannot be in the same block
                uint64(block.number),
                "Commit and reveal cannot be in the same block");       
        require(ticketsNumber == 0 ||                                   // All tickets sold
                block.timestamp > commitsStart + COMMIT_TIMEOUT,        // or Commits Phase time ended.
                "Not all tickets sold yet");
        require(block.timestamp > revealsStart &&                       // After reveal phase start
                block.timestamp < revealsStart + REVEAL_TIMEOUT,        // and before reveal phase end.
                "Not in reveal phase");
        _;
    }

    modifier OutcomePhase {
        require(playersNumber > 0 && revealedNumber == playersNumber || // All players revealed their numbers
                block.timestamp > revealsStart + REVEAL_TIMEOUT,        // or reveal phase ended.
                "Not all players revealed their numbers yet");
        _;
    }

    // No commits start was set yet
    // or noone has bought tickets
    // or noone revealed their number.
    modifier NotInPhase {
        require(commitsStart == 0 ||                                    
                (block.timestamp > commitsStart + COMMIT_TIMEOUT && playersNumber == 0) ||
                (block.timestamp > revealsStart + REVEAL_TIMEOUT && revealedNumber < 2),
                "Lottery is still in process");
        _;
    }

    event LotteryStarted(uint ticketsNumber, uint ticketPrice);
    event BoughtTickets(address player, uint ticketsNumber, uint moneySpent, bytes32 dataHash, uint64 block);
    event Reveal(address player, uint randomNumber);
    event WinnerChosen(address winner, uint prize);

    // Owner sets timers. Lottery starts.
    function startLottery() public OnlyOwner NotInPhase {
        commitsStart = block.timestamp;
        revealsStart = commitsStart + COMMIT_TIMEOUT;
        emit LotteryStarted(ticketsNumber, ticketPrice);
    }

    // Anyone (not the owner), who have not yet bought the tickets, can buy them.
    function buyTickets(bytes32 _hashedNumber, uint _ticketsToBuyNumber) public CommitPhase NotOwnerNorRegisteredPlayer payable {
        require(_ticketsToBuyNumber != 0, "Tickets number cannot be zero");

        // If there is not enought ether for tickets number, we take the maximal possible.
        uint maxTicketsPossible = _ticketsToBuyNumber * ticketPrice > msg.value ?
                                  msg.value / ticketPrice :
                                  _ticketsToBuyNumber;
        // If there is not enough lottery tickets left, we take all that are left.
        uint actualTicketsToBuyNumber = ticketsNumber < maxTicketsPossible ?
                                        ticketsNumber : maxTicketsPossible;

        // Send the unused ether back.
        (bool success, ) = msg.sender.call{value: (msg.value - actualTicketsToBuyNumber * ticketPrice), gas:2300}("");
        require(success, "call failed");
        // Fill players collections.
        _playersCommits[msg.sender] = Commit(actualTicketsToBuyNumber, uint64(block.number), _hashedNumber, false);
        ++playersNumber;
        _players.push(msg.sender);

        // Some tickets were bought.
        ticketsNumber -= actualTicketsToBuyNumber;
        emit BoughtTickets(msg.sender, actualTicketsToBuyNumber, actualTicketsToBuyNumber * ticketPrice, _hashedNumber, uint64(block.number));
    }

    // Player, who has bought tickets, reveals their random number.
    function revealNumber(uint _randomNumber) public RevealPhase OnlyCommittedPlayer {
        require(!_playersCommits[msg.sender].revealed, "Random number already revealed");
        require(_playersCommits[msg.sender].hashedRandom == keccak256(abi.encodePacked(_randomNumber, msg.sender)), "Hash was incorrect");
        // XOR all the players numbers.
        randomNumber ^= _randomNumber;
        _playersCommits[msg.sender].revealed = true;
        ++revealedNumber;

        emit Reveal(msg.sender, _randomNumber);
    }

    // Find the winning ticket and send money to the victor.
    function payWinner() public OutcomePhase {
        // Count all the tickets of the players, who revealed their numbers.
        uint aliveTicketsCount = 0;
        for (uint i = 0; i < playersNumber; ++i) {
            if (_playersCommits[_players[i]].revealed) {
                aliveTicketsCount += _playersCommits[_players[i]].ticketsNumber;
            }
        }

        uint winnerTicketNumber = randomNumber % aliveTicketsCount;

        bool foundWinner = false;
        uint aliveTicketsIterator = 0;
        uint iter = 0;
        address winner;
        // Find the index of the owner of the winning ticket as if array contained only revealed players.
        while (!foundWinner) {
            if (_playersCommits[_players[iter]].revealed) {
                if (_playersCommits[_players[iter]].ticketsNumber +
                    aliveTicketsIterator > winnerTicketNumber) {
                    foundWinner = true;
                    winner = _players[iter];
                } else {
                    aliveTicketsIterator += _playersCommits[_players[iter]].ticketsNumber;
                }
            }
            ++iter;
        }
        
        // Send money to the victor.
        (bool success, ) = winner.call{value: ((maxTicketsNumber - ticketsNumber) * ticketPrice), gas:2300}("");
        require(success, "call failed");
        // Reset timers.
        commitsStart = 0;
        revealsStart = 0;
        emit WinnerChosen(winner, maxTicketsNumber - ticketsNumber);
    }

    // Reset the lottery
    function reset(uint _ticketsNumber, uint _ticketPrice) public OnlyOwner NotInPhase {
        ticketsNumber = _ticketsNumber;
        maxTicketsNumber = _ticketsNumber;
        ticketPrice = _ticketPrice;
        playersNumber = 0;
        revealedNumber = 0;
        randomNumber = 0;
    }
}
