import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import crypto from 'crypto';
import {broadcast, data, invokeScript, transfer, waitForTx} from '@waves/waves-transactions';
import config from '../config/config';
import {getCategoryAdapter} from "./events";
import abi from 'web3-eth-abi';

const nodeREST = config.nodeREST;

const mapKV = (list) => {
  const kv = {};
  _.forEach(list, item => kv[item.key] = item);
  return kv;
};

const getCurrentHeight = async () => {
  const data = await axios.get(`${nodeREST}/blocks/height`);
  return data && data.data && data.data.height;
};

const blocksCache = {};

const getBlock = async (height, useCache = true) => {
  if (!useCache || !blocksCache[height]) {
    const data = await (axios.get(`${nodeREST}/blocks/at/${height}`).catch(() => {}));
    blocksCache[height] = data && data.data;
  }
  return blocksCache[height];
};

export const dexEventId = ({pair, rate, time}) => {
  const ts = moment(time).unix();
  return `dex:${pair}:${Math.round(rate * Math.pow(10, 8))}:${ts}`;
};

export const dexEventIdSplit = (eventId) => {
  const parts = eventId.split(':');
  return {
    adapter: parts[0],
    pair: parts[1],
    rate: parts[2] / Math.pow(10, 8),
    ts: parseInt(parts[3]),
  };
};

const publishAndWait = async (tx) => {
  const txs = Array.isArray(tx) ? tx : [tx];
  const txsSent = [];
  for (let i = 0; i < txs.length; i++) {
    const txObj = typeof txs[i] === 'string' ? JSON.parse(txs[i]) : txs[i];
    txsSent.push(
      (await axios.post(`${nodeREST}/transactions/broadcast`, txObj).catch(e => {
        throw ((e.response && e.response.data) || e);
      })).data);
  }
  for (let i = 0; i < txsSent.length; i++) {
    await waitForTx(txsSent[i].id, {apiBase: nodeREST});
  }
};

export const adapters = {
  sportr: {
    name: 'sportr',
    decimals: 2,
    isRunning: (e) => ([6, 7, 31].indexOf(e.status) >= 0),
    isFinished: (e) => ([100, 110, 120, 125].indexOf(e.status) >= 0),
    fromDataEntry: i => ({...JSON.parse(i.value), adapter: adapters.sportr}),
    getEventName: (event) => `${event.teams[0].name} – ${event.teams[1].name}`,
    getEvents: async ({categoryName, ids}) => {
      if (!config.addressesPub.sportrDataAddress) {
        return {};
      }
      const dateList = '.*'; // TODO correct date list pattern
      const sportCode = categoryName
        ? crypto.createHash('md5').update(categoryName).digest("hex").substr(0, 5)
        : '.*';
      const eventIds = ids ? `(${ids.join('|')})` : '.*';
      const data = await getKeysByMask(config.addressesPub.sportrDataAddress, `event_${eventIds}_${dateList}_${sportCode}`);
      return _.map(data, i => adapters.sportr.fromDataEntry(i))
    },
  },
  dex: {
    name: 'dex',
    decimals: 8,
    isRunning: (e)  => e.timestamp * 1000 > Date.now(),
    isFinished: (e) => e.timestamp * 1000 <= Date.now(),
    fromDataEntry: i => {
      const { adapter, pair, rate, ts } = dexEventIdSplit(i.key.substr(7));
      return {
        external_id: i.key.substr(7),
        subevent: 'rate',
        sport: 'Rates',
        country: 'WAVES',
        league: pair,
        targetRate: rate,
        timestamp: ts,
        adapter: adapters[adapter],
      }
    },
    getEventName: (event) => `${event.league} is above ${event.targetRate} at ${moment.unix(event.timestamp).format('DD MMM HH:mm')}`,
    getEvents: async ({categoryName, ids}) => {
      const data = await getKeysByMask(config.addressesPub.escrowAddress, `market_dex.*`);
      return _.map(data, i => adapters.dex.fromDataEntry(i))
    }
  }
};

const betsFromData = (data) => {
  const bets = {};
  _.forEach(data, bet => {
    const parts = bet.key.split('_'); // bet, eventid, userid, txid, [owner, event, subevent, side, odds, sequence, timestamp]
    const betid = `${parts[0]}_${parts[1]}_${parts[2]}_${parts[3]}`;
    bets[betid] = bets[betid] || {betid, cancel_amount: 0};
    const key = parts.slice(4).join('_');
    bets[betid][key] = bet.value;
  });
  return bets;
};

const matchesFromData = (data) => {
  if (!data) {
    return data;
  }
  const matches = {};
  _.forEach(data, match => {
    const parts = match.key.split('_'); // match, eventid, userid, userid, txid, [amount, for, against, ?paid]
    const matchid = `${parts[0]}_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}`;
    matches[matchid] = matches[matchid] || {matchid, event: parts[1]};
    matches[matchid][parts[5]] = match.value;
  });
  return matches;
};

const getKeysByMask = async (address, mask) => {
  const data = await axios.get(`${nodeREST}/addresses/data/${address}?matches=${mask}`);
  return (data && data.data) ? mapKV(data.data) : null;
};

const getKeyValue = async (address, key) => {
  const data = await axios.get(`${nodeREST}/addresses/data/${address}/${key}`);
  return (data && data.data) ? data.data.value : null;
};

const waitForKeeperTx = async (txData) => {
  try {
    const txParsed = JSON.parse(txData);
    await waitForTx(txParsed.id, {apiBase: nodeREST});
  } catch (e) {
  }
  return txData;
};

const massBroadcast = async (txs) => {
  for (let i = 0; i < txs.length; i++) {
    await axios.post(`${nodeREST}/transactions/broadcast`, JSON.parse(txs[i]));
  }
};

export default {
  makeDeposit: async (auth, amount) => {
    const tx = {
      from: auth.address,
      to: config.eth.ethSmart,
      value: 0,
      gas: '0x30d40',
      data: abi.encodeFunctionCall({
        name: 'deposit',
        type: 'function',
        inputs: [
          {
            type: 'uint256',
            name: 'amount',
          },
        ]
      }, [ Math.round(amount * 10**config.eth.decimalsUSDT)]),
    };
    return await auth.signEthTx(tx);
  },
  unlockDeposit: async (auth) => {
    const tx = {
      from: auth.address,
      to: config.eth.USDT,
      value: 0,
      gas: '0x30d40',
      data: abi.encodeFunctionCall({
        name: 'approve',
        type: 'function',
        inputs: [
          {
            type: 'address',
            name: 'spender',
          },
          {
            type: 'uint256',
            name: 'amount',
          },
        ]
      }, [ config.eth.ethSmart, Math.round(10000 * 10**config.eth.decimalsUSDT)]),
    };
    return await auth.signEthTx(tx);
  },
  fetchPayouts: async () => {
    const data = await getKeysByMask(config.addressesPub.escrowAddress, 'match_.*_(paid|amount)') || [];
    const matches = {};
    _.forEach(data, i => {
      const p = i.key.split('_');
      const event = p.slice(0, 5).join('_');
      const key = p.slice(5).join('_');
      matches[event] = matches[event] || {
        event: dexEventIdSplit(event),
      };
      if (key === 'amount') {
        matches[event][key] = i.value / Math.pow(10, 8);
      } else {
        matches[event][key] = i.value;
      }
    });
    const payouts = _.filter(matches, i => i.paid);
    return _.sortBy(payouts, s => -s.event.ts);
  },
  autoRefund: async ({address, betids}) => {
    const delegateFromLS = localStorage.getItem(`delegate_${address}`);
    if (!delegateFromLS) {
      return delegateFromLS;
    }
    const s = config.Waves.Seed.fromExistingPhrase(delegateFromLS);
    for (let i = 0; i < betids.length; i++) {
      const tx = invokeScript({
        dApp: config.addressesPub.escrowAddress,
        chainId: config.Waves.config.getNetworkByte(),
        call: {
          function: 'cancel',
          args: [
            {value: betids[i], type: 'string'},
          ],
        },
        fee: 500000,
        payment: [],
      }, s.phrase);
      console.log(tx);
      await axios.post(`${nodeREST}/transactions/broadcast`, tx);
    }
  },
  autoApproveDefeat: async ({address, betids}) => {
    const delegateFromLS = localStorage.getItem(`delegate_${address}`);
    if (!delegateFromLS) {
      return delegateFromLS;
    }
    const s = config.Waves.Seed.fromExistingPhrase(delegateFromLS);
    for (let i = 0; i < betids.length; i++) {
      const tx = invokeScript({
        dApp: config.addressesPub.escrowAddress,
        chainId: config.Waves.config.getNetworkByte(),
        call: {
          function: 'approveDefeat',
          args: [
            {value: betids[i], type: 'string'},
            {value: 1, type: 'integer'},
          ],
        },
        fee: 500000,
        payment: [],
      }, s.phrase);
      await axios.post(`${nodeREST}/transactions/broadcast`, tx);
    }
  },
  fetchDelegateStatus: async (address) => {
    const delegateFromLS = localStorage.getItem(`delegate_${address}`);
    if (!delegateFromLS) {
      return {};
    }
    const s = config.Waves.Seed.fromExistingPhrase(delegateFromLS);
    const data = await getKeysByMask(config.addressesPub.escrowAddress, `delegate_${s.address}_.*`).catch(() => {
    });
    const delegateStatus = {};
    _.forEach(data, i => {
      const parts = i.key.split('_'); // delegate, address, address|autoapprove|autocancel
      delegateStatus[parts[2]] = i.value;
    });
    return delegateStatus;
  },
  setDelegate: async ({address, auth}, {autoApprove, autoCancel}) => {
    const key = `delegate_${address}`;
    let delegateSeed = localStorage.getItem(key);
    if (!delegateSeed) {
      delegateSeed = config.Waves.Seed.create().phrase;
      localStorage.setItem(key, delegateSeed);
    }
    const tx = {
      type: 16,
      data: {
        dApp: config.addressesPub.escrowAddress,
        call: {
          function: 'delegate',
          args: [
            {value: config.Waves.Seed.fromExistingPhrase(delegateSeed).address, type: 'string'},
            {value: autoApprove || false, type: 'boolean'},
            {value: autoCancel || false, type: 'boolean'},
          ],
        },
        fee: {
          assetId: 'WAVES',
          tokens: 0.005,
        },
        payment: [],
      },
    };
    console.log(tx);
    return await publishAndWait(await auth.sign());
  },
  // withdraw: async ({prevList, pubKey, address, amount}) => {
  //   const ttx = transfer({
  //     senderPublicKey: pubKey,
  //     recipient: config.addressesPub.escrowAddress,
  //     amount: amount * config.betAssetDecimalsMul,
  //     assetId: config.betAssetId,
  //     fee: config.fee.transferTx.coins,
  //     feeAsset: config.fee.transferTx.assetId,
  //   });
  //
  //   const ttxKeeper = {
  //     type: 4,
  //     data: {
  //       amount: {
  //         assetId: ttx.assetId || 'WAVES',
  //         coins: ttx.amount,
  //       },
  //       fee: {
  //         assetId: ttx.feeAssetId || 'WAVES',
  //         coins: ttx.fee,
  //       },
  //       recipient: ttx.recipient,
  //       timestamp: ttx.timestamp,
  //       senderPublicKey: ttx.senderPublicKey,
  //     }
  //   };
  //
  //   const txid = ttx.id;
  //   const newHistory = prevList ? `${prevList},${txid}` : txid;
  //
  //   const registerTx = {
  //     type: 12,
  //     data: {
  //       senderPublicKey: config.addressesPub.gatewayPubKey,
  //       data: [
  //         {key: `${pubKey}_withdraw_history`, value: newHistory, type: 'string'},
  //         {key: `${txid}_time`, value: Date.now(), type: 'integer'},
  //         {key: `${txid}_destination`, value: address, type: 'string'},
  //         {key: `${txid}_amount`, value: ttx.amount, type: 'integer'},
  //         {key: `${txid}_key`, value: pubKey, type: 'string'},
  //       ],
  //       proofs: ['withdrawin', pubKey, txid],
  //       fee: {
  //         coins: config.fee.dataTxGateway.coins,
  //         assetId: config.fee.dataTxGateway.assetId,
  //       }
  //     }
  //   };
  //   const signed = await window.WavesKeeper.signTransactionPackage([ttxKeeper, registerTx]);
  //   await massBroadcast(signed);
  // },
  // fetchGatewayTxById: async (txid) => {
  //   if (!txid.length) {
  //     return [];
  //   }
  //   const data = await getKeysByMask(config.addressesPub.gatewayAddress, `(${_.join(txid, '|')})_.*`);
  //   const transactions = {};
  //   _.forEach(data, tx => {
  //     const parts = tx.key.split('_'); // txid, key
  //     const txid = parts[0];
  //     const key = parts.slice(1).join('_');
  //     transactions[txid] = transactions[txid] || {txid};
  //     if (key === 'amount') {
  //       transactions[txid][key] = tx.value / config.betAssetDecimalsMul;
  //     } else {
  //       transactions[txid][key] = tx.value;
  //     }
  //   });
  //   return _.values(transactions);
  // },
  fetchDepositTransactionsList: async (pubKey) => {
    const key = `${pubKey}_deposit_history`;
    const data = await getKeysByMask(config.addressesPub.gatewayAddress, key);
    return data && data[key] && data[key].value && data[key].value.split(',');
  },
  fetchWithdrawTransactionsList: async (pubKey) => {
    const key = `${pubKey}_withdraw_history`;
    const data = await getKeysByMask(config.addressesPub.gatewayAddress, key);
    return data && data[key] && data[key].value && data[key].value.split(',');
  },
  fetchDepositAddress: async (pubKey) => {
    const key = `${pubKey}_deposit_address`;
    const data = await getKeysByMask(config.addressesPub.gatewayAddress, key);
    return data && data[key] && data[key].value;
  },
  fetchBalance: async (address, trustedGenerator) => {
    const balances = {};
    const data = await getKeysByMask(config.addressesPub.escrowAddress, `balance_${trustedGenerator}_${address}_.*`);
    _.forEach(data, item => {
      const parts = item.key.split('_');
      balances[parts[3]] = item.value;
    });
    return balances;
  },
  fetchEvents: async (categoryName) => {
    const adapter = adapters[getCategoryAdapter(categoryName)];
    return await adapter.getEvents({categoryName});
  },
  fetchMatchesByEvents: async (events) => {
    if (!events.length) {
      return {}
    }
    const data = await getKeysByMask(config.addressesPub.escrowAddress, `match_(${_.uniq(events).join('|')})_.*`);
    return matchesFromData(data);
  },
  fetchMatchesByOwner: async (owner) => {
    const data = await getKeysByMask(config.addressesPub.escrowAddress, `match_.*_${owner.substr(owner.length - 10)}_.*`);
    return matchesFromData(data);
  },
  fetchEventsById: async (ids) => {
    const uIds = _.uniq(ids);
    const sportrIds = _.filter(uIds, i => i && i.match(/^sportr:/));
    const dexIds = _.filter(uIds, i => i && i.match(/^dex:/));
    const lists = await Promise.all([
      sportrIds.length > 0 && (adapters.sportr.getEvents({ids: sportrIds})),
      dexIds.length > 0 && (adapters.dex.getEvents({})),
    ]);
    const retVal = {};
    _.forEach(lists, list => {
      list && _.forEach(list, v => retVal[v.external_id] = v);
    });
    return retVal;
  },
  fetchBetsByOwner: async (owner) => {
    const data = await getKeysByMask(config.addressesPub.escrowAddress, `bet_.*_${owner}_.*`);
    if (!data) {
      return data;
    }
    return betsFromData(data);
  },
  fetchBetsByEvent: async (eventIds) => {
    if (!eventIds.length) {
      return {}
    }
    const data = await getKeysByMask(config.addressesPub.escrowAddress, `bet_(${_.uniq(eventIds).join('|')})_.*`);
    if (!data) {
      return data;
    }
    return betsFromData(data);
  },
  fetchBetsById: async (betIds) => {
    if (!betIds.length) {
      return {}
    }
    const ids = _.uniq(_.map(betIds, id => `${id}_.*`));
    const data = await getKeysByMask(config.addressesPub.escrowAddress, `(${_.uniq(ids).join('|')})`);
    if (!data) {
      return data;
    }
    return betsFromData(data);
  },
  generateDepositAddress: async (pubKey) => {
    const tx = data({
      senderPublicKey: config.addressesPub.gatewayPubKey,
      proofs: ['request', pubKey],
      fee: config.fee.dataTx.coins,
      feeAssetId: config.fee.dataTx.assetId,
      data: [
        {key: `${pubKey}_deposit_address`, value: '', type: 'string'},
      ]
    });
    await broadcast(tx, config.nodeREST);
    return await waitForTx(tx.id, {apiBase: nodeREST});
  },
  sendPayouts: async (matches) => {
    for (let i = 0; i < matches.length; i++) {
      const tx = invokeScript({
        dApp: config.addressesPub.escrowAddress,
        chainId: config.Waves.config.getNetworkByte(),
        call: {
          function: 'payWinner',
          args: [
            {value: matches[i], type: 'string'},
          ],
        },
        fee: 500000,
        payment: [],
      }, config.dummySeed);
      await broadcast(tx, config.nodeREST);
    }
  },
  sendDexJudge: async (matches) => {
    const dexPast = Date.now() - config.maxDexPast;
    const finders = _.map(matches, m => {
      const { pair, ts } = dexEventIdSplit(m.event);
      return {
        ...config.assetsPairs[pair],
        ts: ts * 1000,
        match: m,
        completed: false,
        candidateRate: null,
        candidateTX: null,
        candidateTS: null,
      }
    }).filter(f => f.ts > dexPast);

    if (!finders.length) {
      return false;
    }

    let maxHeight = null;
    for (let i = 0; i < finders.length; i++) {
      const event = finders[i].match.event;
      const currentData = await (getKeysByMask(config.addressesPub.dexAgentAddress, `${event}_.*`).catch(() => {}));
      finders[i].currentData = currentData;
      if (!maxHeight && currentData[`${event}_height`] && (currentData[`${event}_height`].value > maxHeight)) {
        maxHeight = currentData[`${event}_height`].value;
      }
    }

    const currentHeight = maxHeight || (await getCurrentHeight());
    let skipMore = false;
    for (let h = currentHeight; ; h = h - (skipMore ? 100 : 1)) {
      skipMore = true;
      const block = (await getBlock(h)) || {};
      let needToSeekMore = !block.timestamp;
      !!block.timestamp && _.forEach(_.filter(finders, ff => !ff.completed), f => {
        skipMore = skipMore && (block.timestamp - f.ts > 1000 * 60 * 60 * 24);
        if (block.timestamp > f.ts) {
          needToSeekMore = true;
          _.forEach(block.transactions, tx => {
            if ((tx.type === 7) && (tx.timestamp >= f.ts)) {
              if ((tx.order1.assetPair.amountAsset === f.amountAsset)
                && (tx.order1.assetPair.priceAsset === f.priceAsset)
                && tx.order1.matcherPublicKey === config.matcherPublicKey
              ) {
                f.candidateRate = tx.price;
                f.candidateTX = tx.id;
                f.candidateTS = tx.timestamp;
                f.candidateHeight = h;
              }
            }
          });
        } else {
          f.completed = true;
          console.log('completed on block', block);
        }
      });
      if (!needToSeekMore) {
        console.log('break on height', h);
        break;
      }
    }
    console.log(finders);
    const completeFinders = _.filter(finders, f => f.completed && f.candidateTX);

    for (let i = 0; i < completeFinders.length; i++) {
      const m = completeFinders[i];

      try {
        const tx = data({
          data: [
            {key: `${m.match.event}_rate`, value: m.candidateRate, type: 'integer'},
            {key: `${m.match.event}_timestamp`, value: m.candidateTS, type: 'integer'},
            {key: `${m.match.event}_tx`, value: m.candidateTX, type: 'string'},
            {key: `${m.match.event}_eventts`, value: Math.round(m.ts / 1000), type: 'integer'},
            {key: `${m.match.event}_height`, value: m.candidateHeight, type: 'integer'},
          ],
          fee: 500000,
          senderPublicKey: config.addressesPub.dexAgentPubKey,
        });

        await broadcast(tx, config.nodeREST);
        await waitForTx(tx.id, {apiBase: nodeREST});
      } catch (e) {
        // ignore errors
      }

      const tx2 = invokeScript({
        dApp: config.addressesPub.escrowAddress,
        chainId: config.Waves.config.getNetworkByte(),
        call: {
          function: 'judgeDexMatch',
          args: [
            {value: m.match.matchid, type: 'string'},
          ],
        },
        fee: 500000,
        payment: [],
      }, config.dummySeed);
      await broadcast(tx2, config.nodeREST);
    }
    return true;
  },
  sendMatches: async (matches) => {
    for (let i = 0; i < matches.length; i++) {
      const tx = invokeScript({
        dApp: config.addressesPub.escrowAddress,
        chainId: config.Waves.config.getNetworkByte(),
        call: {
          function: 'betMatch',
          args: [
            {value: matches[i].forId, type: 'string'},
            {value: matches[i].againstId, type: 'string'},
          ],
        },
        fee: 500000,
        payment: [],
      }, config.dummySeed);
      await broadcast(tx, config.nodeREST);
    }
  },
  getStacks: (bets) => {
    const matches = [];
    const stacksBySubevents = {};
    const bySubevents = {};
    if (bets.length < 1) {
      return {matches, stacksBySubevents};
    }
    const decimalsMul = Math.pow(10, adapters[bets[0].adapter].decimals);
    _.forEach(bets, bet => {
      bySubevents[bet.subevent] = bySubevents[bet.subevent] || [];
      bySubevents[bet.subevent].push(_.clone(bet));
    });
    _.forEach(bySubevents, (s, subevent) => {
      const subeventBets = _.sortBy(s, b => b.sequence);
      _.forEach(subeventBets, bet => {
        const oppositeSide = _.filter(subeventBets, b => b.side !== bet.side);
        const oppositeSideSorted = _.sortBy(oppositeSide, b => b.side === 'for' ? b.odds : -b.odds);
        _.forEach(oppositeSideSorted, b => {
          if (((bet.side === 'for') && (bet.odds <= b.odds))
            || ((bet.side === 'against') && (bet.odds >= b.odds))) {
            const betFor = bet.side === 'for' ? bet : b;
            const betAgainst = bet.side === 'against' ? bet : b;
            const againstNominal = (betAgainst.amount - betAgainst.spent) / (betAgainst.odds / 100 - 1);
            const matchNominal = Math.min((betFor.amount - betFor.spent), againstNominal);
            if (matchNominal > config.minMatchCoins * decimalsMul) {
              betFor.spent += matchNominal;
              betAgainst.spent += Math.floor(matchNominal * (betFor.odds / 100 - 1));
              matches.push({
                forId: betFor.betid,
                againstId: betAgainst.betid,
              });
            }
          }
        });
      });
      const stackFor = [];
      const stackAgainst = [];
      _.forEach(subeventBets, bet => {
        if (bet.amount - bet.spent >= config.minMatchCoins) {
          const stack = bet.side === 'for' ? stackFor : stackAgainst;
          let stackOdds = _.find(stack, entry => entry.odds === bet.odds);
          if (!stackOdds) {
            stack.push({odds: bet.odds, items: [], stackAmount: 0});
            stackOdds = stack[stack.length - 1];
          }
          stackOdds.items.push(bet);
          stackOdds.stackAmount += (bet.amount - bet.spent) / (bet.side === 'for' ? 1 : bet.odds / 100 - 1)  / decimalsMul;
        }
      });
      stacksBySubevents[subevent] = {
        stackFor: {items: _.sortBy(stackFor, i => i.odds), sum: _.sumBy(stackFor, i => i.stackAmount)},
        stackAgainst: {items: _.sortBy(stackAgainst, i => -i.odds), sum: _.sumBy(stackAgainst, i => i.stackAmount)},
      };
    });
    return {matches, stacksBySubevents};
  },
  cancelBet: async ({betid, auth}) => {
    const tx = {
      type: 16,
      data: {
        dApp: config.addressesPub.escrowAddress,
        call: {
          function: 'cancel',
          args: [
            {value: betid, type: 'string'},
          ],
        },
        fee: {
          assetId: 'WAVES',
          tokens: 0.005,
        },
        payment: [],
      },
    };
    return await publishAndWait(await auth.sign(tx));
  },
  massCancelBet: async ({bets, auth}) => {
    const txs = _.map(bets.slice(0, 7), betid => ({
      type: 16,
      data: {
        dApp: config.addressesPub.escrowAddress,
        call: {
          function: 'cancel',
          args: [
            {value: betid, type: 'string'},
          ],
        },
        fee: {
          assetId: 'WAVES',
          tokens: 0.005,
        },
        payment: [],
      },
    }));
    return await publishAndWait(await auth.sign(txs));
  },
  approveDefeat: async ({betid, code, auth}) => {
    const tx = {
      type: 16,
      data: {
        dApp: config.addressesPub.escrowAddress,
        call: {
          function: 'approveDefeat',
          args: [
            {value: betid, type: 'string'},
            {value: code, type: 'integer'},
          ],
        },
        fee: {
          assetId: 'WAVES',
          tokens: 0.005,
        },
        payment: [],
      },
    };
    return await publishAndWait(await auth.sign(tx));
  },
  massApproveDefeat: async ({bets, auth}) => {
    const txs = _.map(bets.slice(0, 7), betid => ({
      type: 16,
      data: {
        dApp: config.addressesPub.escrowAddress,
        call: {
          function: 'approveDefeat',
          args: [
            {value: betid, type: 'string'},
            {value: 1, type: 'integer'},
          ],
        },
        fee: {
          assetId: 'WAVES',
          tokens: 0.005,
        },
        payment: [],
      },
    }));
    return await publishAndWait(await auth.sign(txs));
  },
  bet: async ({side, event, subevent, odds, amount, asset, auth, onSigned, onRejected}) => {
    const adapters = _.uniq(config.topCategories.map(c => c.adapter)).join('|');
    const mType = event.match(new RegExp(`^(${adapters}):`));
    if (!mType) {
      throw "Unknown event type";
    }
    const adapter = mType[1];
    const tx = {
      type: 16,
      data: {
        dApp: config.addressesPub.escrowAddress,
        call: {
          function: 'bet',
          args: [
            {value: event.toString(), type: 'string'},
            {value: subevent, type: 'string'},
            {value: side, type: 'string'},
            {value: Math.round(odds * 100), type: 'integer'},
            {value: adapter, type: 'string'},
          ],
        },
        fee: {
          assetId: 'WAVES',
          tokens: 0.005,
        },
        payment: [{
          tokens: Math.round(10000 * amount * (side === 'for' ? 1 : odds - 1)) / 10000,
          assetId: config.assetIds[asset] || asset,
        }],
      },
    };
    const signedTx = await auth.sign(tx).catch((e) => {
      onRejected && onRejected();
      throw e;
    });
    onSigned && onSigned();
    return await publishAndWait(signedTx);
  },
};
