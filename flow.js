/**
 * In another window, launch TestRPC using `testrpc`.
 * Install dependencies `npm install solc web3`
 */

'use strict';

/******* INITIALIZATIONS ********/
const NODE_ADDRESS = 'http://localhost:8545', ACCOUNT_PASSWORD = 'foobar';

const web3 = require('web3'), solc = require('solc');
const sourceCode = 'pragma solidity ^0.4.4;\n\ncontract Debit {\n\tuint buffer = 0;\n\n\tfunction getBuffer() returns (uint) {\n\t\treturn buffer;\n\t}\n\n\tfunction setBuffer(uint b) {\n\t\tbuffer = b;\n\t}\n}\n';

let compiled = solc.compile(sourceCode),
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

if(!Web3.personal.unlockAccount(myAccount, ACCOUNT_PASSWORD, 15000)) {
	console.log(`Unlocking account ${myAccount} failed. Exiting...`);
	process.exit(1);
}

/******* Creating & Deploying Contracts ********/
const w3ContractObject = Web3.eth.contract(abi),
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



/******* Libraries & Contracts ********/
/**
 * Using libraries
 * First deploy the library, obtain its address. Next, compile contract & obtain byte code.
 * Then link the bytecode with deployed library.
 */

// Import resolution
const sources = {
	'MyLib.sol': 'library MyLib { function foo() {} }',
	'Main.sol': 'import "./MyLib.sol";\ncontract MainC { function abc() { MyLib.foo(); } }'
};

compiled = solc.compile({ sources }, 1);

// Deploy the library
const libraryBC = compiled.contracts['MyLib.sol:MyLib'].bytecode,
	contractBC = compiled.contracts['Main.sol:MainC'].bytecode,
	libraryABI = JSON.parse(compiled.contracts['MyLib.sol:MyLib'].interface),
	contractABI = JSON.parse(compiled.contracts['Main.sol:MainC'].interface);

const w3LibraryObject = Web3.eth.contract(libraryABI);
w3ContractObject = Web3.eth.contract(contractABI);

const libraryInstance = w3LibraryObject.new({from: myAccount, data: libraryBC, gas: 1000000});

contractBC = solc.linkBytecode(contractBC, {'MyLib.sol:MyLib': libraryInstance.address});
contractInstance = w3ContractObject.new({from: myAccount, data: contractBC, gas: 1000000});


/**
 * TODO:
 * Make, deploy & use Library - DONE
 * Transfer ether (contract -> contract, contract -> user account & vice versa)
 * Write the upgrade contract (keeps track of all versions of the contract, directs user to the right one)
 * Use other services (ipfs, swarm, whisper)
 */
