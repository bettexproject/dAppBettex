const { decodeInput } = require('../utils');

module.exports = async (app, record) => {
    console.log(record);
    const input = decodeInput(record.input);
    console.log(input);
    // app.models.bet.add()
};
