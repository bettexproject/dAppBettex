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
        data: String,
        input: String,
    });
    const proofModel = app.mongoose.model('proof', proofSchema);

    app.models.proofEvent = {
        updateSnapshot: async (params) => {
            console.log(params);
        },
        add: async (params) => {
            const record = await proofModel.findOne({ hash: params.hash });
            if (record && record.blockNumber) {
                return null;
            }
            if (!record) {
                console.log('adding to db', params);
                const r = await proofModel.create(params);
                await app.models.proofEvent.updateSnapshot(params);
                return r;
            } else {
                console.log('updating from utx to confirmed');
                record.set(params);
                await record.save();
                await app.models.proofEvent.updateSnapshot(params);
            }
        },
        // transaction failed or dismissed by network fork
        dismiss: async (txHash) => {
            const r = await proofModel.findOne({ hash: txHash });
            await proofModel.deleteOne({ hash: txHash });
            await app.models.proofEvent.updateSnapshot(r);
            return r;
        },
        getUnmined: async (blocksFrom, blocksUntil) => {
            return await proofModel.find({ blockNumber: { $gt: blocksFrom, $lt: blocksUntil } }, {}, { sort: { blockNumber: 1, index: 1 } });
        },
        getLastTx: async (scanFrom) => {
            return await proofModel.find({ $or: [{blockNumber: {$eq: 0}}, {blockNumber: {$gt: scanFrom }}] }, {}, { sort: { blockNumber: 1, index: 1 } });
        },
    };
};
