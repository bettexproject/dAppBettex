module.exports = ({ mongoose }) => {

    const configSchema = new mongoose.Schema({
        key: {
            type: String,
            unique: true,
        },
        value: String,
    });
    const configModel = mongoose.model('config', configSchema);

    const configGet = async (key) => {
        const record = await configModel.findOne({ key });
        return record ? record.value : null;
    };

    const configSet = async (key, value) => {
        const record = (await configModel.findOne({ key })) || new configModel({ key, value });
        record.value = value;
        await record.save();
    };

    return {
        get: configGet,
        set: configSet,
    };
};
