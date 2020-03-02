const Web3 = require('web3');
const _ = require('lodash');
const { decodeInput } = require('../utils');
const config = require('../config');

const web3 = new Web3(new Web3.providers.HttpProvider(config.web3URL));
const web3wss = new Web3(config.web3wss);
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);

const lastScannedKey = 'lastScanned';

module.exports = (app) => {
    const scanner = {
        checkTx: async (tx, unconfirmedDeposit) => {
            if (tx && tx.to && (tx.to.toLowerCase() === config.escrowAddress)) {
                const input = decodeInput(tx.input);
                if (config.proofMethods[input.name]
                    && (unconfirmedDeposit || (input.name !== 'deposit'))) {
                    await app.models.proof.add({
                        type: input.name,
                        blockNumber: tx.blockNumber || 0,
                        index: tx.transactionIndex || -tx.gasPrice,
                        hash: tx.hash,
                        account: tx.from && tx.from.toLowerCase(),
                        input: tx.input,
                    });
                }
            }
        },
        parseBlock: async (blockData) => {
            const txs = (blockData && blockData.transactions) || [];
            for (let i = 0; i < txs.length; i++) {
                await scanner.checkTx(txs[i], true);
            }
        },

        endlessScan: async () => {
            const firstBlock = await contract.methods.firstBlock().call();
            for (; ;) {
                try {
                    const lastScanned = parseInt(await app.models.config.get(lastScannedKey) || '0');
                    const lastKnown = await web3.eth.getBlockNumber();

                    const scanFrom = Math.min(Math.max(firstBlock, lastScanned), lastKnown - config.rescanDepth);

                    for (let i = scanFrom; i <= lastKnown; i++) {
                        console.log('scanning', i);
                        const blockData = await web3.eth.getBlock(i, true).catch(() => {});
                        if (!blockData) {
                            continue;
                        }
                        await scanner.parseBlock(blockData);
                        await app.models.config.set(lastScannedKey, i);
                    }
                } catch (e) {
                    console.log(e);
                }
                await new Promise(r => setTimeout(r, 10000));
            }

        },
        pendingScanner: async () => {
            web3wss.eth.subscribe('pendingTransactions', (err, txhash) => {
                web3.eth.getTransaction(txhash)
                .then(tx => scanner.checkTx(tx, false));
            });
        },

        recheckLastTx: async () => {
            for (;;) {
                try {
                    const lastKnown = await web3.eth.getBlockNumber();
                    const lastTxs = await app.models.proof.getLastTx(lastKnown - config.rescanDepth);
                    if (!lastTxs) {
                        continue;
                    }
                    for (let i = 0; i < lastTxs.length; i++) {
                        const txHash = lastTxs[i].hash;
                        const tx = await web3.eth.getTransaction(txHash);
                        if (!tx) {
                            console.log('disappeared', txHash);
                            await app.models.proof.dismiss(txHash);
                        } else {
                            const receipt = await web3.eth.getTransactionReceipt(txHash);
                            if (receipt && !receipt.status) {
                                console.log('failed', txHash);
                                await app.models.proof.dismiss(txHash);
                            }
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
                await new Promise(r => setTimeout(r, 10000));
            }
        }
    };

    app.scanner = scanner;
    scanner.endlessScan();
    // scanner.pendingScanner();
    scanner.recheckLastTx();
};
