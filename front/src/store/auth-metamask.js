import config from "../config/config";

export default async () => {
  if (!window.ethereum || !window.ethereum.isMetaMask) {
    throw 'metamask not found';
  }

  const accounts = await window.ethereum.enable();
  console.log(window.ethereum.chainId);
  if (window.ethereum.chainId !== config.requiredChainId) {
    throw 'invalid chaid id (testnet instead of mainnet and so on)';
  }

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
  }
};
