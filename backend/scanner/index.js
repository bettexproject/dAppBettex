const Web3 = require('web3');
const config = require('../config');

const web3 = new Web3(config.web3URL);
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
    },
    endlessScan: async () => {
        for (; ;) {
            try {
                let i = await web3.eth.getBlockNumber() - config.rescanDepth;
                i = parseInt(await contract.methods.nextNonzero(i).call());
                if (i === 0) {
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                await scanner.blockScan(i);
            } catch (e) {
                console.log(e);
            }
        }
    },

    blockScan: async (blockNum) => {
        console.log(blockNum);
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
                            await scanner.app.models.proofEvent.add({
                                type: proofEvent,
                                blockNumber: receipt.blockNumber,
                                hash: tx.hash,
                                data: logRecord.data,
                                index: tx.transactionIndex,
                            });
                        }
                    }
                }
            }
        }
    },
};

module.exports = async (app) => {
    scanner.app = app;
    await scanner.initialScan();

    scanner.endlessScan();
};
