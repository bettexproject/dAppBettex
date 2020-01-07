const Web3 = require('web3');
const { uint2bytes32, str2bytes32, callContract } = require('../utils');
const config = require('../config');

const web3 = new Web3(config.web3URL);
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);
const senderAccount = web3.eth.accounts.privateKeyToAccount(config.privKey);

const miner = {
    endlessScan: async () => {
        for (; ;) {
            const lastMined = parseInt(await contract.methods.lastBlock().call());
            const lastKnown = parseInt(await web3.eth.getBlockNumber());
            if (lastMined >= lastKnown - config.confirmations) {
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            const pendingProofs = await miner.app.models.proofEvent.getUnmined(lastMined, lastKnown - config.confirmations);
            if (pendingProofs.length > 0) {
                const compressedActions = miner.serializeProofs(pendingProofs);
                const callData = contract.methods.playback(1000000, compressedActions).encodeABI();
                console.log(compressedActions);
                // process.exit();
                const nonce = await web3.eth.getTransactionCount(senderAccount.address);
                await callContract(config.escrowAddress,
                    0,
                    callData,
                    nonce,
                    3000000,
                    Math.round(0.000000010 * 10 ** 18), // TODO dynamic gas price
                    config.privKey)
                    .catch(console.log);
            }
        }
    },
    serializeProofs: (proofs) => {
        const byBlocks = {};
        const blockNumbers = [];
        const compressedData = [];

        proofs.forEach(element => {
            if (!byBlocks[element.blockNumber]) {
                blockNumbers.push(element.blockNumber);
                byBlocks[element.blockNumber] = [];
            }
            byBlocks[element.blockNumber].push(element);
        });

        console.log(byBlocks, blockNumbers);

        blockNumbers.forEach(blockNumber => {
            const chainLength = byBlocks[blockNumber].length;
            compressedData.push(`0x${uint2bytes32(blockNumber)}`);
            compressedData.push(`0x${uint2bytes32(chainLength)}`);

            byBlocks[blockNumber].forEach(chainItem => {
                if (
                    chainItem.type === 'deposit' ||
                    chainItem.type === 'withdraw' ||
                    chainItem.type === 'bet'
                ) {
                    compressedData.push(`0x${str2bytes32(chainItem.type)}`);
                    for (let j = 2 + 64; j < chainItem.data.length; j += 64) {
                        compressedData.push(`0x${chainItem.data.substr(j, 64)}`);
                    }
                    if (chainItem.type === 'bet') {
                        // add hint
                        compressedData.push(`0x${uint2bytes32(0)}`);
                    }

                }
            });
        });

        return compressedData;
    },

};

module.exports = (app) => {
    miner.app = app;
    miner.endlessScan();
};