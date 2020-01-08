const Web3 = require('web3');
const config = require('../config');
const betHandler = require('./bet');
const depositHandler = require('./deposit');
const withdrawHandler = require('./withdraw');
const { decodeInput } = require('../utils');

const proofHandlers = {
    bet: betHandler,
    deposit: depositHandler,
    withdraw: withdrawHandler,
};

const web3 = new Web3(config.web3URL);
const web3wss = new Web3(config.web3wss);
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);

const LASTSCANNED = 'lastScanned';

const scanner = {
    initialScan: async () => {
        const scanStartPoint = Math.max(
            parseInt(await contract.methods.contractCreated().call()),
            parseInt((await scanner.app.models.config.get(LASTSCANNED) || 0))
        );

        let lastKnownBlock = await web3.eth.getBlockNumber();

        for (i = scanStartPoint; ;) {
            try {
                if (i > lastKnownBlock) {
                    lastKnownBlock = await web3.eth.getBlockNumber();
                    if (i > lastKnownBlock) {
                        break;
                    }
                }
                i = parseInt(await contract.methods.nextNonzero(i).call());
                if (i === 0) {
                    break;
                }
                await scanner.blockScan(i);
                i++;
            } catch (e) {
                console.log(e);
            }
        }
        return lastKnownBlock;
    },
    endlessScan: async (lastScanned) => {
        for (; ;) {
            let i = Math.min(await web3.eth.getBlockNumber() - config.rescanDepth, lastScanned);
            for (; ;) {
                try {
                    i = parseInt(await contract.methods.nextNonzero(i).call());
                    console.log(i);
                    if (i === 0) {
                        break;
                    }
                    await scanner.blockScan(i);
                    i++;
                    lastScanned = i;
                } catch (e) {
                    console.log(e);
                }
                await new Promise(r => setTimeout(r, 3000));
            }

        }
    },

    blockScan: async (blockNum) => {
        const blockData = await web3.eth.getBlock(blockNum, true);
        const txs = blockData.transactions;
        for (let i = 0; i < txs.length; i++) {
            const tx = txs[i];
            if (tx.to && (tx.to.toLowerCase() === config.escrowAddress.toLowerCase())) {
                const receipt = await web3.eth.getTransactionReceipt(tx.hash);
                if (!receipt || !receipt.logs) {
                    throw ('unexpected error');
                }
                const logs = receipt.logs;
                for (let i = 0; i < logs.length; i++) {
                    const logRecord = logs[i];
                    if (logRecord.topics && logRecord.topics[0]) {
                        const proofEvent = config.proofEvents[logRecord.topics[0]];
                        if (proofEvent) {
                            const record = await scanner.app.models.proofEvent.add({
                                type: proofEvent,
                                blockNumber: receipt.blockNumber,
                                index: tx.transactionIndex,
                                hash: tx.hash,
                                data: logRecord.data,
                                input: tx.input,
                            });
                            if (record && proofHandlers[proofEvent]) {
                                await proofHandlers[proofEvent](scanner.app, record);
                            }
                        }
                    }
                }
            }
        }
    },
    pendingScanner: async () => {
        web3wss.eth.subscribe('pendingTransactions', async (err, txhash) => {
            const tx = await web3.eth.getTransaction(txhash);
            if (tx.to && (tx.to.toLowerCase() === config.escrowAddress.toLowerCase())) {
                const input = decodeInput(tx.input);
                console.log(input);
                if (input.name === 'bet') {
                    scanner.app.models.proofEvent.add({
                        type: 'bet',
                        blockNumber: 0,
                        index: 0,
                        hash: tx.hash,
                        data: '0x',
                        input: tx.input,
                    });
                }
            }
        });
    },
};

module.exports = async (app) => {
    scanner.app = app;
    const lastKnown = await scanner.initialScan();
    scanner.endlessScan(lastKnown);
    scanner.pendingScanner();
};
