const BigNumber = require('bignumber.js');

const bytes32toAddress = (b) => {
    return `0x${b.substr(24)}`;
}

const bytes32toNumber = (b) => {
    return new BigNumber(`0x${b}`).toNumber();
}

module.exports = ({ db }) => {
    return {
        deposit: async (data) => {
            console.log(data);
            const account = bytes32toAddress(data[1]);
            const amount = bytes32toNumber(data[2]);
            db.user.deposit(account, amount);
        },
    }
};