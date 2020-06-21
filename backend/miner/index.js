const { str2bytes32, uint2bytes32, address2bytes32, string2bytes32, decodeInput, callContract } = require('../utils');
const { findEventIdx } = require('../subeventresults');
const Web3 = require('web3');
const _ = require('lodash');
const config = require('../config');
const web3 = new Web3(new Web3.providers.HttpProvider(config.web3URL));
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);
const minerAcc = web3.eth.accounts.privateKeyToAccount(config.minerPrivKey);
const eventAcc = web3.eth.accounts.privateKeyToAccount(config.eventPrivKey);

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
                            if (input.name === '__callback') {
                                serializedActions.push(`0x${address2bytes32(unmined[i].account)}`);
                                string2bytes32(input.result, serializedActions);
                            }
                            if (input.name === 'payouts') {
                                serializedActions.push(`0x${uint2bytes32(input.bets.length)}`);
                                _.forEach(input.bets, b => serializedActions.push(`0x${uint2bytes32(b)}`));
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
        fetchResults: async () => {
            for (; ;) {
                try {
                    const need2fetch = await app.models.sportr.getUnfetchedProofs();
                    if (need2fetch.length > 0) {
                        const eventid = need2fetch[0];

                        await app.models.sportr.updateFetchResultBlock(eventid, await web3.eth.getBlockNumber());

                        const lastEvent = await app.models.sportr.findById(eventid);
                        if (lastEvent) {
                            const updatedEvent = await findEventIdx(lastEvent);
                            if (updatedEvent) {
                                const { sportId, countryId, leagueId, matchId, date } = updatedEvent;
                                const datesplit = date.split('-');
                                console.log(updatedEvent);
                                const callData =
                                    contract.methods.fetchEventResult(sportId,
                                        datesplit[0],
                                        datesplit[1],
                                        datesplit[2],
                                        countryId,
                                        leagueId,
                                        matchId,
                                        config.eventProvableGasAmount).encodeABI();
                                console.log(callData);

                                const nonce = await web3.eth.getTransactionCount(eventAcc.address);
                                const tx = await callContract(config.escrowAddress,
                                    config.eventProvableContribution,
                                    callData,
                                    nonce,
                                    config.eventGasLimit,
                                    Math.round(config.eventGasPriceHi),
                                    config.eventPrivKey)
                                    .catch(console.log);

                                if (tx && tx.transactionHash) {
                                    await app.models.sportr.updateFetchResultBlock(eventid, tx.blockNumber);
                                }
                            }
                        }
                    }

                    const need2pay = app.models.snap.getUnpaidBetsWithResults();
                    if (need2pay.length > 0) {
                        console.log(need2pay);
                        const callData =
                            contract.methods.payouts(_.map(need2pay, b => b.betid)).encodeABI();
                        console.log(callData);

                        const nonce = await web3.eth.getTransactionCount(eventAcc.address);
                        const tx = await callContract(config.escrowAddress,
                            0,
                            callData,
                            nonce,
                            config.eventGasLimit,
                            Math.round(config.eventGasPriceHi),
                            config.eventPrivKey)
                            .catch(console.log);

                        if (tx && tx.transactionHash) {
                            _.forEach(need2pay, unpaidBet => {
                                unpaidBet.payoutRequested = Date.now();
                            });
                        }
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
    miner.fetchResults();
};
