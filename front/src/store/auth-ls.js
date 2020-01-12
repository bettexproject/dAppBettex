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
  }
};
