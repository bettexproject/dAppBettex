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
    });
    const proofModel = app.mongoose.model('proof', proofSchema);

    app.models.proofEvent = {
        add: async (params) => {
            if (await proofModel.findOne({ hash: params.hash })) {
                return;
            }
            console.log('adding to db', params);
            return await proofModel.create(params);
        },
        getUnmined: async (blocksFrom, blocksUntil) => {
            return await proofModel.find({ blockNumber: {$gt: blocksFrom, $lt: blocksUntil }}, {}, { sort: {blockNumber: 1, index: 1}});
        },
    };
};
