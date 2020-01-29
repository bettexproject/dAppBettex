const config = require('../config');
const { decodeInput } = require('../utils');
const _ = require('lodash');

const ODDS_PRECISION = 100;

const aggregateStack = (_bets, allBets) => {
    const bets = _bets || [];
    const stack = [];
    let lastOdds = null;

    let matched_count = 0;
    let matched_amount = 0;
    let total_amount = 0;
    let total_count = 0;

    for (let i = 0; i < bets.length; i++) {
        const bet = allBets[bets[i]];

        total_count++;
        total_amount += bet.amount;
        if (bet.matched > 0) {
            matched_count++;
            matched_amount += bet.matched;
        }

        if (bet.amount - bet.matched - bet.cancelled < 1) {
            continue;
        }
        if ((lastOdds === null) || (lastOdds !== bet.odds)) {
            stack.push({
                odds: bet.odds,
                items: 0,
                matched: 0,
                unmatched: 0,
            });
            lastOdds = bet.odds;
        }
        const last = stack[stack.length - 1];
        last.items++;
        last.unmatched += (bet.amount - bet.matched - bet.cancelled);
    }
    return { stack, total_count, total_amount, matched_count, matched_amount };
}

const aggregateStacks = (stacks, allBets) => {
    return {
        stackFor: aggregateStack(stacks ? stacks.betsFor : [], allBets),
        stackAgainst: aggregateStack(stacks ? stacks.betsAgainst : [], allBets),
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
                        eventid: parseInt(input.eventid),
                        subevent: parseInt(input.subevent),
                        amount: parseInt(input.amount),
                        odds: parseInt(input.odds),
                        side: input.side,
                        blockNumber: tx.blockNumber,
                        matched: 0,
                        matched_peer: 0,
                        cancelled: 0,
                        hash: tx.hash,
                        paid: false,
                    };

                    state.allBets.push(bet);
                    const betIndex = state.allBets.length - 1;
                    bet.betid = betIndex + 1;

                    state.betsByEvents[eventKey] = state.betsByEvents[eventKey] || [];
                    state.betsByEvents[eventKey].push(bet.betid);

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

            if (input.name === 'cancel') {
                const cancel_bet = state.allBets[input.betid - 1];
                if (cancel_bet && (cancel_bet.account === tx.account)) {
                    const cancel_amount = cancel_bet.amount - cancel_bet.matched - cancel_bet.cancelled;
                    if (cancel_amount > 0) {
                        state.balanceOfAccount[tx.account] += cancel_amount;
                        cancel_bet.cancelled += cancel_amount;
                    }
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
                betsByEvents: {},
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
            const currentHeight = app.currentHeight || 0;
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
            const prevBalances = _.clone(snap.currentState.balanceOfAccount || {});
            const prevBets = _.clone(snap.currentState.allBets || []);
            snap.currentState = await snap.lastConfirmedState();

            const accounts = {};
            _.forEach(_.keys(snap.currentState.balanceOfAccount), (account) => accounts[account] = true);
            _.forEach(_.keys(prevBalances), (account) => accounts[account] = true);

            _.forEach(_.keys(accounts), (account) => {
                if (prevBalances[account] !== snap.currentState.balanceOfAccount[account]) {
                    app.api.fireEvent(`balance-${account}`, snap.currentState.balanceOfAccount[account]);
                }
            });

            for (let i = 0; i < Math.max(snap.currentState.allBets.length, prevBets.length); i++) {
                const currentBet = snap.currentState.allBets[i];
                if (JSON.stringify(currentBet) !== JSON.stringify(prevBets[i])) {
                    if (currentBet) {
                        app.api.fireEvent(`bets-${currentBet.account}`, currentBet);
                        await app.models.sportr.notifyChangeById(currentBet.eventid);
                    } else {
                        app.api.fireEvent(`bets-${prevBets[i].account}`, { ...prevBets[i], dismiss: true });
                        await app.models.sportr.notifyChangeById(prevBets[i].eventid);
                    }
                }
            }
        },
        getMatchedUnpaidSubevents: () => {
            const ret = {};
            _.forEach(snap.currentState.allBets, bet => {
                if ((bet.matched > 0) && !bet.paid) {
                    const eventKey = `${bet.eventid}-${bet.subevent}`;
                    ret[eventKey] = true;
                }
            });
            return ret;
        },

        getUnpaidBets: () => {
            return _.filter(snap.currentState.allBets, bet => !bet.paid && bet.blockNumber > 0);
        },

        getAccountBalance: (account) => {
            return snap.currentState.balanceOfAccount[account] || 0;
        },
        getAccountBets: (account) => {
            return _.filter(snap.currentState.allBets, bet => bet.account === account);
        },

        getEventStacks: (eventid) => {
            const ret = {};
            _.forEach(_.keys(config.subevents),
                subevent =>
                    ret[subevent] = aggregateStacks(snap.currentState.eventStacks[`${eventid}-${subevent}`],
                        snap.currentState.allBets));
            return ret;
        },

        currentState: {
            balanceOfAccount: {},
            eventStacks: {},
            allBets: [],
        },
    };

    app.models.snap = snap;
};
