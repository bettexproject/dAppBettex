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
        input: String,
        state: {
            type: Boolean,
            default: true,
        },
    });
    proofSchema.index({ account: 1 });
    const proofModel = app.mongoose.model('proof', proofSchema);

    app.models.proof = {
        add: async (params) => {
            const record = await proofModel.findOne({ hash: params.hash });
            if (record && (record.blockNumber === params.blockNumber)) {
                return null;
            }
            if (!record) {
                console.log('adding to db', params);
                const r = await proofModel.create(params);
                await app.models.snap.update();
                return r;
            } else  {
                if (!record.blockNumber) {
                    console.log('updating from utx to confirmed');
                } else {
                    console.log('changed block number');
                }
                record.set(params);
                await record.save();
                await app.models.snap.update();
            }
        },
        // transaction failed or dismissed by network fork
        dismiss: async (txHash) => {
            const r = await proofModel.findOne({ hash: txHash });
            r.state = false;
            await r.save();
            await app.models.snap.update();
            return r;
        },
        getLastTx: async (scanFrom) => {
            return await proofModel.find({ $and: [{ state: true }, { $or: [{ blockNumber: { $eq: 0 } }, { blockNumber: { $gt: scanFrom } }] }] },
                {}, { sort: { blockNumber: 1, index: 1 } });
        },
        txsFrom: async (blocksFrom) => {
            const txs = await proofModel.find(
                {
                    $and: [{ state: true }, { $or: [{ blockNumber: { $gt: blocksFrom } }, { blockNumber: { $eq: 0 } }] }]
                }, {}, { sort: { blockNumber: 1, index: 1 } });
            if (!txs) {
                return txs;
            }
            const resultTxs = [];
            txs.forEach(tx => (tx.blockNumber !== 0) && resultTxs.push(tx));
            txs.forEach(tx => (tx.blockNumber === 0) && resultTxs.push(tx));
            return resultTxs;
        },
    };
};
