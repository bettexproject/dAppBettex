const Web3 = require('web3');
const config = require('../config');

const { decodeInput } = require('../utils');

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
        scanner.app.currentHeight = lastKnownBlock;

        for (i = scanStartPoint; ;) {
            try {
                console.log(i);
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
                await scanner.app.models.config.set(LASTSCANNED, i);
            } catch (e) {
                console.log(e);
            }
        }
        return lastKnownBlock;
    },
    endlessScan: async (lastScanned) => {
        for (; ;) {
            const lastKnown = await web3.eth.getBlockNumber();
            let i = Math.min(lastKnown - config.rescanDepth, lastScanned);
            scanner.app.currentHeight = lastKnown;
            for (; ;) {
                try {
                    i = parseInt(await contract.methods.nextNonzero(i).call());
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
                                account: tx.from && tx.from.toLowerCase(),
                                data: logRecord.data,
                                input: tx.input,
                            });
                        }
                    }
                }
            }
        }
    },
    pendingScanner: async () => {
        web3wss.eth.subscribe('pendingTransactions', async (err, txhash) => {
            const tx = await web3.eth.getTransaction(txhash);
            if (tx && tx.to && (tx.to.toLowerCase() === config.escrowAddress.toLowerCase())) {
                const input = decodeInput(tx.input);
                if (input.name === 'bet') {
                    scanner.app.models.proofEvent.add({
                        type: 'bet',
                        blockNumber: 0,
                        index: -tx.gasPrice,
                        hash: tx.hash,
                        data: '0x',
                        account: tx.from && tx.from.toLowerCase(),
                        input: tx.input,
                    });
                }
            }
        });
    },
    recheckLastTx: async () => {
        for (;;) {
            try {
                const lastKnown = await web3.eth.getBlockNumber();
                scanner.app.currentHeight = lastKnown;
                const lastTxs = await scanner.app.models.proofEvent.getLastTx(lastKnown - config.rescanDepth);
                if (!lastTxs) {
                    continue;
                }
                for (let i = 0; i < lastTxs.length; i++) {
                    const txHash = lastTxs[i].hash;
                    const tx = await web3.eth.getTransaction(txHash);
                    if (!tx) {
                        console.log('disappeared', txHash);
                        await scanner.app.models.proofEvent.dismiss(txHash);
                    } else {
                        const receipt = await web3.eth.getTransactionReceipt(txHash);
                        if (receipt && !receipt.status) {
                            console.log('failed', txHash);
                            await scanner.app.models.proofEvent.dismiss(txHash);
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

module.exports = async (app) => {
    scanner.app = app;
    const lastKnown = await scanner.initialScan();
    scanner.endlessScan(lastKnown);
    scanner.pendingScanner();
    scanner.recheckLastTx();

    app.models.snap.update();
};
