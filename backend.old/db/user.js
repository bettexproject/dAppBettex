module.exports = ({ mongoose, db }) => {

    const balanceSchema = new mongoose.Schema({
        address: {
            type: String,
            unique: true,
        },
        value: {
            type: Number,
            default: 0,
        }
    });
    const balanceModel = mongoose.model('balance', balanceSchema);

    const balanceHistorySchema = new mongoose.Schema({
        address: String,
        value: Number,
        type: String,
        timestamp: {
            type: Date,
            default: Date.now,
        },
    });

    balanceHistorySchema.index({ address: 1 });
    balanceHistorySchema.index({ type: 1 });
    const balanceHistoryModel = mongoose.model('balanceHistory', balanceHistorySchema);

    return {
        getBalance: async (address) => {
            const record = (await balanceModel.findOne({ address })) || new balanceModel({ address, value: 0 });
            return record.value;
        },
        deposit: async (address, amount) => {
            const record = (await balanceModel.findOne({ address })) || new balanceModel({ address, value: 0 });
            record.value += amount;
            await record.save();
            await balanceHistoryModel.create({ address, value: amount, type: 'deposit' });
        },
        getDepositHistory: async (address) => {
            return await balanceHistoryModel.find({ address, type: {$in: ['deposit', 'withdraw']} }, { }, { sort: { timestamp: 1 }});
        },
    };
};
