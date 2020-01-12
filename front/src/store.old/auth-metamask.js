import config from "../config/config";

export default async () => {
  if (!window.ethereum || !window.ethereum.isMetaMask) {
    throw 'metamask not found';
  }

  const accounts = await window.ethereum.enable();
  return {
    name: 'metamask',
    address: accounts[0],
    publicKey: accounts[0],
    seed: null,
    signEthTx: async(tx) => {
      return await new Promise(r => {
        window.ethereum.sendAsync({
          method: 'eth_sendTransaction',
          params: [tx],
        }, r);
      });
    },
    // sign: async (tx) => {
    //   if (Array.isArray(tx)) {
    //     return await window.WavesKeeper.signTransactionPackage(tx);
    //   } else {
    //     return await window.WavesKeeper.signTransaction(tx);
    //   }
    // },
  }
};
