import config from "../config/config";
import {invokeScript} from "@waves/waves-transactions";

export default async () => {
  let lsSeed = localStorage.getItem('ls_seed');
  if (!lsSeed) {
    lsSeed = config.Waves.Seed.create().phrase;
    localStorage.setItem('ls_seed', lsSeed);
  }
  const seedObject = config.Waves.Seed.fromExistingPhrase(lsSeed);
  return {
    name: 'local',
    address: seedObject.address,
    publicKey: seedObject.keyPair.publicKey,
    seed: seedObject.phrase,
    // sign: async (tx) => {
    //   const txs = Array.isArray(tx) ? tx : [tx];
    //   return _.map(txs, t => {
    //     console.log(t);
    //     if (t.type === 16) {
    //       console.log(t.data);
    //       return invokeScript({
    //         dApp: t.data.dApp,
    //         call: t.data.call,
    //         fee: t.data.fee.tokens * Math.pow(10, 8),
    //         feeAssetId: t.data.fee.assetId,
    //         payment: _.map(t.data.payment, p => ({
    //           amount: t.data.payment[0].tokens * Math.pow(10, 8),
    //           assetId: t.data.payment[0].assetId,
    //         })),
    //       }, seedObject.phrase);
    //     } else {
    //       throw `unsupported tx type ${t.type}`;
    //     }
    //   });
    // },
  }
};
