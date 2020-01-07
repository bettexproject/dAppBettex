const Web3 = require('web3');
const _ = require('lodash');
const config = require('./config');

const web3 = new Web3(config.web3URL);
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);

const senderAccount = web3.eth.accounts.privateKeyToAccount(config.privKey);

const callContract = async (address, value, data, nonce, gas, gasPrice, pk) => {
    const signedTx = await web3.eth.accounts.signTransaction({
        to: address,
        value: Math.round(value / 10 ** 14) * 10 ** 14,
        nonce,
        data,
        gas,
        gasPrice,
    }, pk);
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
};

const sendProofsChains = async (proofEvents, force, currentBlock) => {
    if (!force && (proofEvents.length < 1)) {
        return;
    }
    const proofByBlocks = {};
    for (let i = 0; i < proofEvents.length; i++) {
        const e = proofEvents[i];
        const block = e.blockNumber;
        proofByBlocks[block] = proofByBlocks[block] || [];
        proofByBlocks[block].push(e.toObject());
    }

    const minBlock = _.min(_.keys(proofByBlocks));
    const compressedActions = [];

    if (minBlock) {
        const chainOfMinBlock = proofByBlocks[minBlock];

        for (let i = 0; i < chainOfMinBlock.length; i++) {
            const action = chainOfMinBlock[i];
            const dataSplit = [];
            for (let j = 2; j < action.data.length; j += 64) {
                dataSplit.push(action.data.substr(j, 64));
            }
            if (action.type === 'bet') {
                compressedActions.push('0x6265740000000000000000000000000000000000000000000000000000000000');
                for (let j = 1; j < 7; j++) {
                    compressedActions.push(`0x${dataSplit[j]}`);
                }
                compressedActions.push('0x0000000000000000000000000000000000000000000000000000000000000000');
            }
            if (action.type === 'deposit') {
                compressedActions.push('0x6465706f73697400000000000000000000000000000000000000000000000000');
                for (let j = 1; j < 3; j++) {
                    compressedActions.push(`0x${dataSplit[j]}`);
                }
            }
        }
    }

    const callData = contract.methods.playback(minBlock || currentBlock, 1000000, compressedActions).encodeABI();
    console.log(callData);
    // process.exit();
    const nonce = await web3.eth.getTransactionCount(senderAccount.address);
    await callContract(config.escrowAddress,
        0,
        callData,
        nonce,
        3000000,
        Math.round(0.000000001 * 10 ** 18), // TODO dynamic gas price
        config.privKey)
        .catch(console.log);
};

module.exports = async ({ db }) => {
    // console.log(await web3.eth.getGasPrice());
    for (; ;) {
        try {
            const lastScanned = parseInt(await contract.methods.lastBlock().call());
            let lastBlock = await web3.eth.getBlockNumber();

            if (lastScanned > lastBlock) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            const proofEvents = await db.proofEvent.find({ blockNumber: { $gt: lastScanned } });
            await sendProofsChains(proofEvents,
                lastBlock - lastScanned > config.forceMineEmpty,
                Math.min(lastBlock, lastScanned + config.maxEmptyPerRequest));
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            await new Promise(r => setTimeout(r, 10000));
         }
    }
};

