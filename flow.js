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
let sources = {
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



/******* Contract calling other contract & watching events ********/
/**
 * There are 2 ways (same as web3):
 * 1. Create and deploy a new instance of a contract from inside your main contract
 * 2. Create instance of an already deployed contract (using its address) inside your main contract.
 *
 * You can either import a contract file in your main contract or create an abstract contract with function signatures
 * same as those of the dependancy contract.
 */

// 2.
let code = 'contract Base {\n\tfunction foo(uint value) returns (uint) {\n\t\treturn (value * 10);\n\t}\n}\n';
compiled = solc.compile(code);
abi = JSON.parse(compiled.contracts[':Base'].interface);
bytecode = compiled.contracts[':Base'].bytecode;
let baseInstance = Web3.eth.contract(abi).new({from: myAccount, data: bytecode, gas: 1000000});

code = '\ncontract Base {\n\tfunction foo(uint value) returns (uint);\n}\n\ncontract Child {\n\tevent Trigger(uint value);\n\n\tfunction bar(address contractAddr, uint value) {\n\t\tBase myBase = Base(contractAddr);\n\t\tTrigger(myBase.foo(value));\n\t}\n}\n';
compiled = solc.compile(code);
abi = JSON.parse(compiled.contracts[':Child'].interface);
bytecode = compiled.contracts[':Child'].bytecode;
let childInstance = Web3.eth.contract(abi).new({from: myAccount, data: bytecode, gas: 1000000});

childInstance.Trigger().watch(console.log);
childInstance.bar(baseInstance.address, 167, {from: myAccount});


// 1.
code = 'contract Base {\n\tfunction foo(uint value) returns (uint) {\n\t\treturn (value * 10);\n\t}\n}\n\ncontract Child {\n\tevent Trigger(uint value);\n\n\tfunction bar(uint value) {\n\t\tBase myBase = new Base();\n\t\tTrigger(myBase.foo(value));\n\t}\n}\n';
compiled = solc.compile(code);
abi = JSON.parse(compiled.contracts[':Child'].interface);
bytecode = compiled.contracts[':Child'].bytecode;
childInstance = Web3.eth.contract(abi).new({from: myAccount, data: bytecode, gas: 1000000});

childInstance.Trigger().watch(console.log);
childInstance.bar(98, {from: myAccount, gas: 1000000}); // Supply gas from here so Child could create new Base contract




/**
 * TODO:
 * Make, deploy & use Library - [DONE]
 * Contract using another contract's functionality (dependancy) - [DONE]
 * Use other services (ipfs, swarm, whisper, bigchainDB)
 * Transfer ether (contract -> contract, contract -> user account & vice versa) (use send() for an address object)
 *		address(0x90...).send(100);	// sends 100 wei
 * Best ways to upgrade libraries & contracts (pushing updates - how will continuous depoyment happen)
 * everything about DELEGATECALL
 * ethereum frontier vs homestead vs others - difference in development
 * How to connect a contract to outside world (internet) in general (any port, url, protocol)
 * How do oracles work?
 * Testing
 * Auditing, monitoring & profiling in smart contracts
 * How to watch contracts for state change?
 * What's the use of the return value of a function that's called as a transaction?
 * First making transaction then watching for return value - this is too complex - should be simplified
 * How can Dapp front end code reside on swarm / ipfs and get served to user (ie flow starting from ENS)
 */
