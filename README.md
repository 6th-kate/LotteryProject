# Solidity lottery project

This project contains a smart-contract for carrying out a lottery. It comes with the contract, a test for that contract, and a script that deploys that contract.

## How it works overall
The lottery allows user to buy tickets, and then randomly chooses one winner who gets everyones tickets total cost. It means that the more tickets you buy, the more probable is the win.

## Randomizing
As Ethereum blockchain is a deterministic system, it is not possible to generate a truly random number inside the code. So it is needed to get the ramdom number from outside of the code. There are several options of integration with other systems, for example, oracles, but it takes a lot of trust in them. Although integration may be one of the most common workarounds in this case, it was decided to choose another algorithm.

As it should be sufficient to have only one good random number in contract, even the owner can pass it to the contract. However, the owner thus may commit a fraud by negotiating with several lottery participants. This is why it was decided that the chosen algorithm should take random from direct contract users - the lottery participants themselves. 

## The algorithm
As anything stored in the blockchain can be seen from anywhere, it is not secure to save the random number until all the tickets were bought. This is where commit-reveal scheme takes part: 

1. Firstly, while user is buying lottery tickets, they should send a hash of their random number concatenated with their address. This hash will be stored in the blockchain.

2. Secondly, after all the users have sent their hashes, user has to confirm their number by sending it alone, not hashed. The contracts hashes the number with the sender address and compares it to the initial hash. If the hashes are equal, user is considered as trusted and their number is XORed with the current random number to get the ultimate random from all users.

3. Finally, the winning ticket is found by taking a modulo from the random, and its owner becomes the winner and receives all the money taken from tickets.

Note: if the users would send number hashes without salting them with their addresses, attackers, by sending the same hashes, can set the random equal to 0 due to the fact that a XOR a = 0

## Vulnerability protection
The greatest vulnerability of the algoritm is that the last person to reveal their number has a choice whether to reveal or to not reveal as they know all other users numbers. This can be solved either by setting minimal deposit (minimal number of tickets or ticket price) large enought so that it would become economically inefficient, or by setting a "house" account, that will be always the last to reveal. However, it is quite dangerous, as it makes system semi-centralized and sensible to one account possible shutdown or unavailability due to an attact.

As for true randomness vulnerability, it is actually well-considered by this contract, as it takes only one good random number to protect the whole system, so in order that none of the numbers were random, all the users must generate their numbers cooperatively, which gives us to the point of total meaninglessness of this kind of attack.
