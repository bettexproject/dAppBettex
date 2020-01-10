const config = require('../config');
const { decodeInput } = require('../utils');


module.exports = (app) => {
    const snapSchema = new app.mongoose.Schema({
        blockNumber: Number,
        state: Buffer,
    });
    snapSchema.index({ blockNumber: 1 }, { unique: true });
    const snapModel = app.mongoose.model('Snap', snapSchema);

    const snap = {
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
                    state.allBets.push({
                        account: tx.account,
                        eventid: input.eventid,
                        subevent: input.eventid,
                        amount: input.amount,
                        odds: input.odds,
                        side: input.side,
                    });
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
                    // consume opposite TODO

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
            snap.currentState = await snap.lastConfirmedState();
            console.log(snap.currentState);
            console.log(snap.currentState.eventStacks);
        },
        currentState: {},
    };


    app.models.snap = snap;
};
