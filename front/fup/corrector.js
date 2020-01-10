const _ = require("lodash");
const axios = require("axios");
const { data, broadcast } = require('@waves/waves-transactions');
const config = require('../src/config/config');
const nodeREST = config.nodeREST;

const mapKV = (list) => {
  const kv = {};
  _.forEach(list, item => kv[item.key] = item);
  return kv;
};

const getKeysByMask = async (address, mask) => {
  const data = await axios.get(`${nodeREST}/addresses/data/${address}?matches=${mask}`);
  return (data && data.data) ? mapKV(data.data) : null;
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

const d8 = Math.pow(10, 8);

const main = async () => {
  const owners = {};
  const d = await getKeysByMask(config.addressesPub.escrowAddress, "bet_.*_owner");
  _.forEach(d, i => {
    owners[i.value] = i.value;
  });
  console.log(_.keys(owners));
  console.log(_.keys(owners).length);
};

main();

/*
const see = 'broken fury excuse face element action report accuse valid moment rose during';

const corrected = [
  'match_dex:WAVES/USD:99900000:1569207600_pf2gKHCEkz_sdnPTdTDeD_PxhWSK2k4H',
  'match_dex:WAVES/USD:99900000:1569207600_chy5CL3A8H_pf2gKHCEkz_hH6QkpVSuE',
  'match_dex:WAVES/USD:99900000:1569207600_m4z5VgBsxd_pf2gKHCEkz_vU4eaWsN7k',
  'match_dex:WAVES/USD:99900000:1569207600_pf2gKHCEkz_6AD1Un9iUv_1CjybcvLuk',
  'match_dex:WAVES/USD:99900000:1569207600_pf2gKHCEkz_6AD1Un9iUv_awzCXs8qau',
  'match_dex:WAVES/USD:99900000:1569207600_pf2gKHCEkz_dY2ggfvVzU_iumrdEHAVU',
  'match_dex:WAVES/USD:99900000:1569207600_xWwAYfLZox_pf2gKHCEkz_NWbMJcXWh8',
  'match_dex:WAVES/USD:99900000:1569207600_xWwAYfLZox_sdnPTdTDeD_Gi8s7AEsRL',
  'match_dex:WAVES/USD:99900000:1569207600_xWwAYfLZox_sdnPTdTDeD_ZWDdckhbwo',
];

const main = async () => {
  const fupMAtches = _.values(matchesFromData(await getKeysByMask(config.addressesPub.escrowAddress, 'match_dex:WAVES/USD:99900000:1569207600_.*')));
  // console.log(fupMAtches);
  for (let i = 0; i < fupMAtches.length; i++) {
    const m = fupMAtches[i];
    if (corrected.indexOf(m.matchid) < 0) {
      const callDisputeTx = data({
        data: [
          {key: `${m.for}_defeat`, value: 2, type: 'integer'},
          {key: `${m.matchid}_judged`, value: false, type: 'boolean'},
          {key: `${m.matchid}_paid`, value: false, type: 'boolean'},
        ],
        fee: 500000,
      }, see);
      console.log('amount:', m.amount / d8);
      console.log(callDisputeTx);
      // await broadcast(callDisputeTx, nodeREST);


      break;
    }
  }
};

main();
*/