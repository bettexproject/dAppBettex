const config = require('../config');
const { decodeInput } = require('../utils');
const _ = require('lodash');

const ODDS_PRECISION = 1000;

const aggregateStacks = (stacks) => {
    console.log(stacks);
    return {
        stackFor: [],
        stackAgainst: [],
    }
};

module.exports = (app) => {
    const snapSchema = new app.mongoose.Schema({
        blockNumber: Number,
        state: Buffer,
    });
    snapSchema.index({ blockNumber: 1 }, { unique: true });
    const snapModel = app.mongoose.model('Snap', snapSchema);

    const snap = {
        consumeOpposite: (list, betIndex, allBets) => {
            const thisBet = allBets[betIndex];
            const sortValue = thisBet.odds;
            const direction = thisBet.side;
            for (let i = 0; i < list.length; i++) {
                const thatBet = allBets[list[i]];
                const placeValue = thatBet.odds;
                if (
                    (!direction && (placeValue > sortValue)) ||
                    (direction && (placeValue < sortValue))
                ) {
                    break;
                }
                const betFor = direction ? thisBet : thatBet;
                const betAgainst = !direction ? thisBet : thatBet;
                const oddsToMatch = betFor.odds;
                const maxFor = (betFor.amount - betFor.matched - betFor.cancelled) * (oddsToMatch - ODDS_PRECISION) / ODDS_PRECISION;
                const maxAgainst = (betAgainst.amount - betAgainst.matched - betAgainst.cancelled);
                const maxNominal = maxFor < maxAgainst ? maxFor : maxAgainst;
                const spentFor = maxNominal * ODDS_PRECISION / (oddsToMatch - ODDS_PRECISION);
                const spentAgainst = maxNominal;
                betFor.matched += spentFor;
                betFor.matched_peer += spentAgainst;
                betAgainst.matched += spentAgainst;
                betAgainst.matched_peer += spentFor
            }
        },

        insertValue: (list, index, allBets) => {
            const sortValue = allBets[index].odds;
            const direction = allBets[index].side;

            for (let i = 0; i < list.length; i++) {
                const placeValue = allBets[list[i]].odds;
                if (
                    (direction && (placeValue > sortValue)) ||
                    (!direction && (placeValue < sortValue))
                ) {
                    const newList = [];
                    for (let k = 0; k < list.length; k++) {
                        if (k === i) {
                            newList.push(index);
                        }
                        newList.push(list[k]);
                        return newList;
                    }
                }
            }
            list.push(index);
            return list;
        },
        replayTx: (state, tx) => {
            const input = tx.input ? decodeInput(tx.input) : {};
            if (input.name === 'deposit') {
                state.balanceOfAccount[tx.account] = (state.balanceOfAccount[tx.account] || 0) + parseInt(input.amount);
            }
            if (input.name === 'bet') {
                if (state.balanceOfAccount[tx.account] >= input.amount) {
                    state.balanceOfAccount[tx.account] -= input.amount;
                    const eventKey = `${input.eventid}-${input.subevent}`;
                    const bet = {
                        account: tx.account,
                        eventid: input.eventid,
                        subevent: input.eventid,
                        amount: input.amount,
                        odds: input.odds,
                        side: input.side,
                        matched: 0,
                        matched_peer: 0,
                        cancelled: 0,
                        hash: tx.hash,
                    };

                    state.allBets.push(bet);
                    const betIndex = state.allBets.length - 1;
                    state.eventStacks[eventKey] = state.eventStacks[eventKey] || {
                        betsFor: [],
                        betsAgainst: [],
                    };

                    const thisSide = input.side ? state.eventStacks[eventKey].betsFor : state.eventStacks[eventKey].betsAgainst;
                    const oppositeSide = !input.side ? state.eventStacks[eventKey].betsFor : state.eventStacks[eventKey].betsAgainst;

                    // insert bet to stack
                    const newThisSide = snap.insertValue(thisSide, betIndex, state.allBets);
                    if (input.side) {
                        state.eventStacks[eventKey].betsFor = newThisSide;
                    } else {
                        state.eventStacks[eventKey].betsAgainst = newThisSide;
                    }
                    // consume opposite
                    snap.consumeOpposite(oppositeSide, betIndex, state.allBets);

                }
            }
            if (input.name === 'withdraw') {
                if (state.balanceOfAccount[tx.account] >= input.amount) {
                    state.balanceOfAccount[tx.account] -= input.amount;
                }
            }
        },

        /**
         * get state from previous state and additional txs
         */
        replay: async (fromBlock) => {
            const stateRecord = await snapModel.findOne({ blockNumber: fromBlock });
            const savedState = stateRecord ? JSON.parse(stateRecord.state) : {
                balanceOfAccount: {},
                eventStacks: {},
                allBets: [],
            };
            const additionalTxs = await app.models.proofEvent.txsFrom(stateRecord ? stateRecord.blockNumber : 1);
            let prevBlock = null;
            for (let i = 0; i < additionalTxs.length; i++) {
                const tx = additionalTxs[i];
                if (prevBlock && (tx.blockNumber > prevBlock) && (tx.blockNumber > 0) && (tx.blockNumber < app.currentHeight - config.rescanDepth)) {
                    // await snapModel.create({ blockNumber: prevBlock, state: JSON.stringify(savedState) });
                }
                prevBlock = tx.blockNumber;
                snap.replayTx(savedState, tx);
            }
            return savedState;
        },
        lastConfirmedState: async () => {
            const currentHeight = app.currentHeight;
            const lastConfirmedRecord = await snapModel.find({
                blockNumber: { $lt: currentHeight - config.rescanDepth }
            },
                { blockNumber: 1 }, {
                sort: { blockNumber: -1 },
                limit: 1
            });
            const fromBlock = (lastConfirmedRecord && lastConfirmedRecord.length) ? lastConfirmedRecord[0].blockNumber : 0;
            return await snap.replay(fromBlock);
        },
        update: async () => {
            const prevState = { balanceOfAccount: {}, allBets: [], ..._.cloneDeep(snap.currentState) };
            snap.currentState = await snap.lastConfirmedState();

            const accounts = {};
            _.forEach(_.keys(snap.currentState.balanceOfAccount), (account) => accounts[account] = true);
            _.forEach(_.keys(prevState.balanceOfAccount), (account) => accounts[account] = true);

            _.forEach(_.keys(accounts), (account) => {
                if (prevState.balanceOfAccount[account] !== snap.currentState.balanceOfAccount[account]) {
                    app.api.fireEvent(`balance-${account}`, snap.currentState.balanceOfAccount[account]);
                }
            });

            for (let i = 0; i < Math.max(snap.currentState.allBets.length, prevState.allBets.length); i++) {
                const currentBet = snap.currentState.allBets[i];
                if (JSON.stringify(currentBet) !== JSON.stringify(prevState.allBets[i])) {
                    if (currentBet) {
                        app.api.fireEvent(`bets-${currentBet.account}`, currentBet);
                    } else {
                        app.api.fireEvent(`bets-${prevState.allBets[i].account}`, { ...prevState.allBets[i], dismiss: true });
                    }
                }
            }
        },
        getAccountBalance: (account) => {
            return snap.currentState.balanceOfAccount[account] || 0;
        },
        getAccountBets: (account) => {
            return _.filter(snap.currentState.allBets, bet => bet.account === account);
        },

        getEventStacks: (eventid) => {
            return _.mapValues(_.keys(config.subevents),
                subevent => aggregateStacks(snap.currentState.eventStacks[`${eventid}-${subevent}`]));
        },

        currentState: {},
    };

    app.models.snap = snap;
};
