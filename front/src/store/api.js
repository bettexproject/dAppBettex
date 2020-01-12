import authLS from './auth-ls';
import authMetamask from './auth-metamask';
import ABI from './abi';
import Web3 from 'web3';
import config from '../config/config';

const web3 = new Web3();
const contract = new web3.eth.Contract(ABI, config.escrowAddress);

export default {
    loginLS: authLS,
    loginMetamask: authMetamask,
    makeDeposit: async (auth, amount) => {
        console.log(auth);
        auth.signEthTx({
            from: auth.address,
            to: config.escrowAddress,
            value: 0,
            data: contract.methods.deposit(amount).encodeABI(),
        });
    },
};
