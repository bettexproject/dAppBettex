const { decodeInput } = require('../utils');

module.exports = (app) => {
    const proofSchema = new app.mongoose.Schema({
        type: String,
        blockNumber: Number,
        index: Number,
        hash: {
            type: String,
            unique: true,
        },
        account: String,
        data: String,
        input: String,
    });
    proofSchema.index({ account: 1 });
    const proofModel = app.mongoose.model('proof', proofSchema);

    app.models.proofEvent = {
        add: async (params) => {
            const record = await proofModel.findOne({ hash: params.hash });
            if (record && record.blockNumber) {
                return null;
            }
            if (!record) {
                console.log('adding to db', params);
                const r = await proofModel.create(params);
                await app.models.snap.update();
                return r;
            } else {
                console.log('updating from utx to confirmed');
                record.set(params);
                await record.save();
                await app.models.snap.update();
            }
        },
        // transaction failed or dismissed by network fork
        dismiss: async (txHash) => {
            const r = await proofModel.findOne({ hash: txHash });
            await proofModel.deleteOne({ hash: txHash });
            await app.models.snap.update();
            return r;
        },
        getUnmined: async (blocksFrom, blocksUntil) => {
            return await proofModel.find({ blockNumber: { $gt: blocksFrom, $lt: blocksUntil } }, {}, { sort: { blockNumber: 1, index: 1 } });
        },
        txsFrom: async (blocksFrom) => {
            const txs = await proofModel.find({ $or: [{ blockNumber: { $gt: blocksFrom } }, { blockNumber: { $eq: 0 } }] }, {}, { sort: { blockNumber: 1, index: 1 } });
            if (!txs) {
                return txs;
            }
            const resultTxs = [];
            txs.forEach(tx => (tx.blockNumber !== 0) && resultTxs.push(tx));
            txs.forEach(tx => (tx.blockNumber === 0) && resultTxs.push(tx));
            return resultTxs;
        },
        getLastTx: async (scanFrom) => {
            return await proofModel.find({ $or: [{ blockNumber: { $eq: 0 } }, { blockNumber: { $gt: scanFrom } }] }, {}, { sort: { blockNumber: 1, index: 1 } });
        },
    };
};
