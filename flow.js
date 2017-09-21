/**
 * In another window, launch TestRPC using `testrpc`.
 * Install dependencies `npm install solc web3`
 */

const NODE_ADDRESS = 'http://localhost:8545', ACCOUNT_PASSWORD = 'foobar';

const web3 = require('web3'), solc = require('solc');
const sourceCode = require('fs').readFileSync('./Debit.sol', 'utf8');

const compiled = solc.compile(sourceCode),
	byteCode = compiled.contracts[':Debit'].bytecode,
	abi = JSON.parse(compiled.contracts[':Debit'].interface);

const Web3 = new web3();

Web3.setProvider(new web3.providers.HttpProvider(NODE_ADDRESS));
Web3.personal.newAccount(ACCOUNT_PASSWORD);

const myAccount = Web3.personal.listAccounts[0];

console.log(`Account created successfully. Current balance information: ${Web3.eth.getBalance(myAccount)}`);
console.log('Transferring some ether to my account from Web3.eth.coinbase...');

Web3.eth.sendTransaction({from: Web3.eth.coinbase, to: myAccount, value: 30000000000000});

console.log(`Done! Update balance information: ${Web3.eth.getBalance(myAccount)}`);

if (!Web3.personal.unlockAccount(myAccount, ACCOUNT_PASSWORD, 15000)) {
	console.log(`Unlocking account ${myAccount} failed. Exiting...`);
	process.exit(1);
}

const w3ContractObject = Web3.eth.contract (abi),
	contractInstance = w3ContractObject.new('Raghav Dua', {from: myAccount, data: byteCode, gas: 1000000});

console.log(`Contract successfully deployed at address ${contractInstance.address}`);

console.log(contractInstance.getBuffer.call({from: myAccount}));	// read-only, costs no ether
contractInstance.setBuffer(69, {from: myAccount});
console.log(contractInstance.getBuffer.call({from: myAccount}));

// Creating second instance of existing contract
// This instance points to the same original contract created because its address is provided here.
// This is how multiple systems can access the deployed contract
const secondContractInstance = w3ContractObject.at(contractInstance.address);

secondContractInstance.setBuffer(9999999, {from: myAccount});
console.log(secondContractInstance.getBuffer.call({from: myAccount}));
console.log(contractInstance.getBuffer.call({from: myAccount}));


/**
 * TODO:
 * Transfer ether (contract -> contract, contract -> user account & vice versa)
 * Make, deploy & use Library
 * Write the upgrade contract (keeps track of all versions of the contract, directs user to the right one)
 * Use other services (ipfs, swarm, whisper)
 */
