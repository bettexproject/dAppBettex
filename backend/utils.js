const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const config = require('./config');

const web3 = new Web3(config.web3URL);

module.exports = {

    uint2bytes32: (uint) => {
        const unpadded = (new BigNumber(uint).toString(16));
        return `${'0000000000000000000000000000000000000000000000000000000000000000'.substr(0, 64 - unpadded.length)}${unpadded}`;
    },

    str2bytes32: (str) => {
        let ret = '0000000000000000000000000000000000000000000000000000000000000000';
        for (let i = 0; i < str.length; i++) {
            const ord = str.charCodeAt(i);
            const ordhex = new BigNumber(ord).toString(16);
            ret = ret.substr(0, i * 2) + ordhex + ret.substr(i * 2 + 2);
        }
        return ret;
    },

    address2bytes32: (address) => {
        const unpadded = address.substr(2);
        return `${'0000000000000000000000000000000000000000000000000000000000000000'.substr(0, 64 - unpadded.length)}${unpadded}`;
    },

    callContract: async (address, value, data, nonce, gas, gasPrice, pk) => {
        const signedTx = await web3.eth.accounts.signTransaction({
            to: address,
            value: Math.round(value / 10 ** 14) * 10 ** 14,
            nonce,
            data,
            gas,
            gasPrice,
        }, pk);
        return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    },

    decodeInput: (str) => {
        const funcSig = str.substr(0, 10);
        for (let i = 0; i < config.abi.length; i++) {
            const abiSig = web3.eth.abi.encodeFunctionSignature(config.abi[i]);
            if (abiSig === funcSig) {
                const parameters = str.substr(10);
                return { name: config.abi[i].name, ...web3.eth.abi.decodeParameters(config.abi[i].inputs, parameters)};
            }
        }
        return null;
    },
};
