module.exports = (app) => {

    const configSchema = new app.mongoose.Schema({
        key: {
            type: String,
            unique: true,
        },
        value: String,
    });
    const configModel = app.mongoose.model('config', configSchema);

    const configGet = async (key) => {
        const record = await configModel.findOne({ key });
        return record ? record.value : null;
    };

    const configSet = async (key, value) => {
        const record = (await configModel.findOne({ key })) || new configModel({ key, value });
        record.value = value;
        await record.save();
    };

    app.models.config = {
        get: configGet,
        set: configSet,
    };
};
