const { str2bytes32, uint2bytes32, address2bytes32, decodeInput, callContract } = require('../utils');
const Web3 = require('web3');
const _ = require('lodash');
const config = require('../config');
const web3 = new Web3(config.web3URL);
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);
const minerAcc = web3.eth.accounts.privateKeyToAccount(config.minerPrivKey);

module.exports = (app) => {
    const miner = {
        endlessScan: async () => {
            for (; ;) {
                try {
                    const byCheckpoints = await app.models.proof.getByCheckpoints();
                    const minedCheckpoint = parseInt(await contract.methods.minedCheckpoint().call());
                    // console.log(byCheckpoints.length > minedCheckpoint + 1);

                    if (byCheckpoints.length > minedCheckpoint + 1) {
                        const unmined = byCheckpoints[minedCheckpoint];
                        console.log(unmined);
                        const serializedActions = [];
                        for (let i = 0; i < unmined.length; i++) {
                            const input = decodeInput(unmined[i].input);
                            serializedActions.push(`0x${str2bytes32(input.name)}`);
                            if (input.name === 'deposit') {
                                serializedActions.push(`0x${address2bytes32(unmined[i].account)}`);
                                serializedActions.push(`0x${uint2bytes32(input.amount)}`);
                            }
                            if (input.name === 'withdraw') {
                                serializedActions.push(`0x${address2bytes32(unmined[i].account)}`);
                                serializedActions.push(`0x${uint2bytes32(input.amount)}`);
                            }
                            if (input.name === 'bet') {
                                serializedActions.push(`0x${address2bytes32(unmined[i].account)}`);
                                serializedActions.push(`0x${uint2bytes32(input.eventid)}`);
                                serializedActions.push(`0x${uint2bytes32(input.subevent)}`);
                                serializedActions.push(`0x${uint2bytes32(input.amount)}`);
                                serializedActions.push(`0x${uint2bytes32(input.odds)}`);
                                serializedActions.push(`0x${uint2bytes32(input.side ? 1 : 0)}`);
                            }
                        }
                        console.log(serializedActions);
                        const calldata = contract.methods.playback(serializedActions, config.minerGasMin).encodeABI();
                        console.log(calldata);

                        await callContract(config.escrowAddress,
                            0,
                            calldata,
                            await web3.eth.getTransactionCount(minerAcc.address),
                            config.minerGasLimit,
                            config.minerGasPrice,
                            config.minerPrivKey);
                    }
                } catch (e) {
                    console.log(e);
                }
                await new Promise(r => setTimeout(r, 10000));
            }
        },
    };
    app.miner = miner;
    miner.endlessScan();
};
