const Web3 = require('web3');
const _ = require('lodash');
const { uint2bytes32, str2bytes32, callContract, decodeInput } = require('../utils');
const { findEventIdx } = require('../subeventresults');
const config = require('../config');

const web3 = new Web3(config.web3URL);
const contract = new web3.eth.Contract(config.abi, config.escrowAddress);
const minerAccount = web3.eth.accounts.privateKeyToAccount(config.minerPrivKey);
const eventAccount = web3.eth.accounts.privateKeyToAccount(config.eventPrivKey);

const miner = {
    sendCompressed: async (compressedActions) => {
        const callData = contract.methods.playback(1000000, compressedActions).encodeABI();
        const nonce = await web3.eth.getTransactionCount(minerAccount.address);
        return await callContract(config.escrowAddress,
            0,
            callData,
            nonce,
            3000000,
            Math.round(config.minerGasPrice),
            config.minerPrivKey)
            .catch(console.log);

    },
    endlessScan: async () => {
        for (; ;) {
            const lastMined = parseInt(await contract.methods.lastBlock().call());
            const lastKnown = parseInt(await web3.eth.getBlockNumber());
            if (lastMined >= lastKnown - config.confirmations) {
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            const pendingProofs = await miner.app.models.proofEvent.getUnmined(lastMined, lastKnown - config.confirmations);
            if ((pendingProofs.length > 0) || (lastKnown - lastMined > config.maxEmptyPerRequest)) {
                const compressedActions = miner.serializeProofs(pendingProofs, lastMined + config.maxEmptyPerRequest);
                await miner.sendCompressed(compressedActions);
            } else if (lastKnown - lastMined > config.forceMineEmpty) {
                const compressedActions = [];
                compressedActions.push(`0x${uint2bytes32(lastMined + config.forceMineEmpty)}`);
                compressedActions.push(`0x${uint2bytes32(0)}`);
                await miner.sendCompressed(compressedActions);
            }
        }
    },
    serializeProofs: (proofs, breakOnBlock) => {
        let byBlocks = {};
        let blockNumbers = [];
        const compressedData = [];

        proofs.forEach(element => {
            if (!byBlocks[element.blockNumber]) {
                blockNumbers.push(element.blockNumber);
                byBlocks[element.blockNumber] = [];
            }
            byBlocks[element.blockNumber].push(element);
        });

        // serialize to empty action on too long
        if (!blockNumbers.length || (blockNumbers[0] > breakOnBlock)) {
            blockNumbers = [breakOnBlock];
            byBlocks = {};
            byBlocks[breakOnBlock] = [];
        }

        blockNumbers.forEach(blockNumber => {
            const chainLength = byBlocks[blockNumber].length;
            compressedData.push(`0x${uint2bytes32(blockNumber)}`);
            compressedData.push(`0x${uint2bytes32(chainLength)}`);

            byBlocks[blockNumber].forEach(chainItem => {
                if (chainItem.type === 'deposit') {
                    compressedData.push(`0x${str2bytes32(chainItem.type)}`);
                    for (let j = 2 + 64; j < 2 + 64 + 2 * 64; j += 64) {
                        compressedData.push(`0x${chainItem.data.substr(j, 64)}`);
                    }
                }
                if (chainItem.type === 'withdraw') {
                    compressedData.push(`0x${str2bytes32(chainItem.type)}`);
                    for (let j = 2 + 64; j < 2 + 64 + 2 * 64; j += 64) {
                        compressedData.push(`0x${chainItem.data.substr(j, 64)}`);
                    }
                }
                if (chainItem.type === 'bet') {
                    compressedData.push(`0x${str2bytes32(chainItem.type)}`);
                    for (let j = 2 + 64; j < 2 + 64 + 6 * 64; j += 64) {
                        compressedData.push(`0x${chainItem.data.substr(j, 64)}`);
                    }
                    compressedData.push(`0x${uint2bytes32(0)}`);
                }
                if (chainItem.type === 'cancel') {
                    compressedData.push(`0x${str2bytes32(chainItem.type)}`);
                    for (let j = 2 + 64; j < 2 + 64 + 2 * 64; j += 64) {
                        compressedData.push(`0x${chainItem.data.substr(j, 64)}`);
                    }
                }
            });
        });

        console.log(compressedData);

        return compressedData;
    },

    fetchEventProofs: async () => {
        for (; ;) {
            try {
                // do oraclize requests
                const need2fetch = await miner.app.models.sportr.getUnfetchedProofs();
                if (need2fetch.length > 0) {
                    const eventid = need2fetch[0];

                    await miner.app.models.sportr.updateFetchResultId(eventid, 'pending');

                    const lastEvent = await miner.app.models.sportr.findById(eventid);
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

                            const nonce = await web3.eth.getTransactionCount(eventAccount.address);
                            const tx = await callContract(config.escrowAddress,
                                config.eventProvableContribution,
                                callData,
                                nonce,
                                config.eventGasLimit,
                                Math.round(config.eventGasPriceHi),
                                config.eventPrivKey)
                                .catch(console.log);

                            if (tx && tx.transactionHash) {
                                const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
                                console.log(receipt);
                                if (receipt) {
                                    for (let i = 0; i < receipt.logs.length; i++) {
                                        const logRecord = receipt.logs[i];
                                        console.log(logRecord.topics);
                                        if (logRecord.topics && (logRecord.topics.length > 0) && (logRecord.topics[0] === config.FetchResultActivated)) {
                                            const reqId = logRecord.data.substr(2, 64);
                                            await miner.app.models.sportr.updateFetchResultId(eventid, reqId, logRecord.blockNumber);
                                            console.log('request id', reqId);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // parse oraclize responses
                const pendingEventProofs = await miner.app.models.sportr.getPendingEventProofs();
                for (let i = 0; i < pendingEventProofs.length; i++) {
                    const resId = pendingEventProofs[i].fetchResultId;
                    if (!resId || (resId.length != 64)) {
                        continue;
                    }
                    const hash = await contract.methods.callbackProofs(`0x${resId}`).call();
                    if (hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                        console.log('hash', hash);
                        await miner.checkEventProofTx(pendingEventProofs[i]);
                    }
                }
            } catch (e) { console.log(e) }
            await new Promise(r => setTimeout(r, 10000));
        }
    },

    checkEventProofTx: async (event) => {
        for (let i = event.fetchResultBlock; i <= await web3.eth.getBlockNumber(); i++) {
            const blockData = await web3.eth.getBlock(i, true);
            const txs = (blockData && blockData.transactions) || [];
            console.log('scanning', i);
            for (let j = 0; j < txs.length; j++) {
                const tx = txs[j];
                if (tx.to && (tx.to.toLowerCase() === config.escrowAddress.toLowerCase())) {
                    const input = decodeInput(tx.input);
                    if ((input.name === '__callback') && (input.myid === `0x${event.fetchResultId}`)) {
                        await miner.app.models.sportr.updateEventResultProof(event.external_id, input.result);
                        console.log(input);
                        const callData = contract.methods.parseEventResult(`0x${event.fetchResultId}`, input.result).encodeABI();
                        console.log(callData);
                        const nonce = await web3.eth.getTransactionCount(eventAccount.address);
                        return await callContract(config.escrowAddress,
                            0,
                            callData,
                            nonce,
                            3000000,
                            Math.round(config.eventGasPriceLo),
                            config.eventPrivKey)
                            .catch(console.log);
                    }
                }
            }
        }
    },

    initPayoutBets: async () => {
        for (; ;) {
            try {
                const unpaidBets = miner.app.models.snap.getUnpaidBets();
                const unpaidEvents = {};
                _.forEach(unpaidBets, bet => {
                    const eventKey = `${bet.eventid}-${bet.subevent}`;
                    unpaidEvents[eventKey] = true;
                });
                const unpaidEventsK = _.keys(unpaidEvents);
                for (let i = 0; i < unpaidEventsK.length; i++) {
                    const s = unpaidEventsK[i].split('-');
                    const status = await contract.methods.getEventStatus(s[0], s[1]).call();
                    console.log(s, status);
                }
            } catch (e) {
                console.log(e);
            }
            await new Promise(r => setTimeout(r, 10000));
        }
    },
};

module.exports = (app) => {
    miner.app = app;
    miner.endlessScan();
    miner.fetchEventProofs();
    miner.initPayoutBets();
};