import authLS from './auth-ls';
import authMetamask from './auth-metamask';
import ABI from './abi';
import Web3 from 'web3';
import axios from 'axios';
import config from '../config/config';

const web3 = new Web3();
const contract = new web3.eth.Contract(ABI, config.escrowAddress);

const gasPrice = async () => {
    const gsapi = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    if (!gsapi || !gsapi.data || !gsapi.data.average) {
        return undefined;
    }

    return web3.utils.toHex(gsapi.data.average * 10**8);
};

export default {
    loginLS: authLS,
    loginMetamask: authMetamask,
    makeDeposit: async (auth, amount) => {
        return auth.signEthTx({
            from: auth.address,
            to: config.escrowAddress,
            value: 0,
            gasPrice: await gasPrice(),
            data: contract.methods.deposit(amount).encodeABI(),
        });
    },
    bet: async (auth, params) => {
        return auth.signEthTx({
            from: auth.address,
            to: config.escrowAddress,
            value: 0,
            gasPrice: await gasPrice(),
            data: contract.methods.bet(params.event,
                params.subevent,
                params.amount * config.decimalMultiplicator,
                params.odds * config.ODDS_PRECISION,
                params.side === 'for').encodeABI(),
        });
    },
    cancelBet: async (auth, betid) => {
        return auth.signEthTx({
            from: auth.address,
            to: config.escrowAddress,
            value: 0,
            gasPrice: await gasPrice(),
            data: contract.methods.cancel(betid).encodeABI(),
        });
    },
};
