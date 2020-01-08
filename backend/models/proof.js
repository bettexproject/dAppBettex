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
        add: async (params) => {
            const record = await proofModel.findOne({ hash: params.hash });
            if (record && record.blockNumber) {
                return null;
            }
            if (!record) {
                console.log('adding to db', params);
                return await proofModel.create(params);
            } else {
                console.log('updating from utx to confirmed');
                record.set(params);
                await record.save();
            }
        },
        getUnmined: async (blocksFrom, blocksUntil) => {
            return await proofModel.find({ blockNumber: { $gt: blocksFrom, $lt: blocksUntil } }, {}, { sort: { blockNumber: 1, index: 1 } });
        },
    };
};
