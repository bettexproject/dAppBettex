const Web3 = require('web3');
const eventHandlersInit = require('./eventhandlers');
const config = require('../config');

const LASTSCANNED = 'lastScanned';

const web3 = new Web3(config.web3URL);
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);

const getBlockRangeTxs = async (start, length) => {
    const txs = [];
    const hashCheck = [];
    for (let i = start; i < start + length; i++) {
        hashCheck.push(contract.methods.proofsByBlock(i).call());
    }

    const result = await Promise.all(hashCheck);

    // merge all blocks txs
    for (let i = 0; i < length; i++) {
        if (result[i] != '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const blockData = await web3.eth.getBlock(i + start, true);
            const resultTxs = (blockData && blockData.transactions) || [];
            for (let j = 0; j < resultTxs.length; j++) {
                txs.push(resultTxs[j]);
            }
        }
    }
    return txs;
};


const filterProofTxs = async (incomingTxs) => {
    const resultTxs = [];
    for (let i = 0; i < incomingTxs.length; i++) {
        const tx = incomingTxs[i];
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
                        resultTxs.push({
                            proofEvent,
                            blockNumber: receipt.blockNumber,
                            hash: tx.hash,
                            data: logRecord.data,
                        });
                    }
                }
            }
        }
    }
    return resultTxs;
}

const addIfNotExists = async (txs, eventHandlers, db) => {
    for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        if (!await db.proofEvent.findOne({ hash: tx.hash })) {
            await db.proofEvent.create({
                type: tx.proofEvent,
                data: tx.data,
                blockNumber: tx.blockNumber,
                hash: tx.hash,
            });
            console.log('adding to db');
            if (eventHandlers[tx.proofEvent]) {
                const dataSplit = [];
                for (let j = 2; j < tx.data.length; j += 64) {
                    dataSplit.push(tx.data.substr(j, 64));
                };
                await eventHandlers[tx.proofEvent](dataSplit);
            }
        }
    }
};

const removeIfDisappeared = async (proofTx, start, db) => {
    const proofTxsKeys = {};
    proofTx.forEach(i => proofTxsKeys[i.hash] = true);
    const txsInDb = await db.proofEvent.find({ blockNumber: { $gte: start}}, { hash: 1});
    for (let i = 0; i < txsInDb.length; i++) {
        if (!proofTxsKeys[txsInDb[i].hash]) {
            console.log(txsInDb[i].hash, 'disappeared');
        }
    }
};

module.exports = async ({ db }) => {
    const eventHandlers = eventHandlersInit({ db });

    const scanStartPoint = Math.max(
        parseInt(await contract.methods.contractCreated().call()),
        parseInt((await db.config.get(LASTSCANNED) || 0))
    );

    console.log('scanning from', scanStartPoint);

    let lastKnownBlock = await web3.eth.getBlockNumber();

    for (let i = scanStartPoint; ;) {
        if (i > lastKnownBlock) {
            lastKnownBlock = await web3.eth.getBlockNumber();
            if (i > lastKnownBlock) {
                break;
            }
            continue;
        }
        const blockTxs = await getBlockRangeTxs(i, Math.min(config.rescanDepth, lastKnownBlock - i + 1));
        const proofTxs = await filterProofTxs(blockTxs);
        await addIfNotExists(proofTxs, eventHandlers, db);

        if (proofTxs.length > 0) {
            console.log(proofTxs);
        }

        i = Math.min(i + config.rescanDepth, Math.max(i + 1, lastKnownBlock));
        console.log(i);
        await db.config.set(LASTSCANNED, i);
    }

    console.log('starting infinite scan');

    for (;;) {
        lastKnownBlock = await web3.eth.getBlockNumber();
        const i = lastKnownBlock - config.rescanDepth + 1;
        const blockTxs = await getBlockRangeTxs(i, config.rescanDepth);
        const proofTxs = await filterProofTxs(blockTxs);
        await addIfNotExists(proofTxs, eventHandlers, db);
        await removeIfDisappeared(proofTxs, i, db);

        await db.config.set(LASTSCANNED, i);
        await new Promise(r => setTimeout(r, 3000));
    }
};
