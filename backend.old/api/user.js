module.exports = ({ db }) => {
    return {
        getBalance: async (req) => {
            const address = req.params.address.toLowerCase();
            const balance = await db.user.getBalance(address);
            return { address, balance };
        },
        getDepositHistory: async (req) => {
            const address = req.params.address.toLowerCase();
            return await db.user.getDepositHistory(address);
        },
    };
};
