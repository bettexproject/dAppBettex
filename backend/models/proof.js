const { decodeInput } = require('../utils');
const config = require('../config');

module.exports = (app) => {
    const proofSchema = new app.mongoose.Schema({
        type: String,
        blockNumber: Number,
        index: Number,
        hash: {
            type: String,
            unique: true,
        },
        account: String,
        input: String,
        state: {
            type: Boolean,
            default: true,
        },
        minedAt: Number,
    });
    proofSchema.index({ account: 1 });
    const proofModel = app.mongoose.model('proof', proofSchema);

    app.models.proof = {
        add: async (params) => {
            const record = await proofModel.findOne({ hash: params.hash });
            if (record && (record.blockNumber === params.blockNumber)) {
                return null;
            }
            if (!record) {
                console.log('adding to db', params);
                const r = await proofModel.create(params);
                await app.models.snap.update();
                return r;
            } else {
                if (!record.blockNumber) {
                    console.log('updating from utx to confirmed');
                } else {
                    console.log('changed block number');
                }
                record.set(params);
                await record.save();
                await app.models.snap.update();
            }
        },
        // transaction failed or dismissed by network fork
        dismiss: async (txHash) => {
            const r = await proofModel.findOne({ hash: txHash });
            r.state = false;
            await r.save();
            await app.models.snap.update();
            return r;
        },
        getLastTx: async (scanFrom) => {
            return await proofModel.find({ $and: [{ state: true }, { $or: [{ blockNumber: { $eq: 0 } }, { blockNumber: { $gt: scanFrom } }] }] },
                {}, { sort: { blockNumber: 1, index: 1 } });
        },
        txsFrom: async (blocksFrom) => {
            const txs = await proofModel.find(
                {
                    $and: [{ state: true }, { $or: [{ blockNumber: { $gt: blocksFrom } }, { blockNumber: { $eq: 0 } }] }]
                }, {}, { sort: { blockNumber: 1, index: 1 } });
            if (!txs) {
                return txs;
            }
            const resultTxs = [];
            txs.forEach(tx => (tx.blockNumber !== 0) && resultTxs.push(tx));
            txs.forEach(tx => (tx.blockNumber === 0) && resultTxs.push(tx));
            return resultTxs;
        },
        getByCheckpoints: async () => {
            const checkpoints = [];
            const fixed = await proofModel.find({ blockNumber: { $ne: 0 }, state: true }, {}, { sort: { blockNumber: 1, index: 1 } });
            let len = 0;
            let slice = [];
            for (let i = 0; i < fixed.length; i++) {
                const proof = fixed[i];
                len += config.proofMethods[proof.type].len;
                if (len > 255) {
                    checkpoints.push(slice);
                    len = config.proofMethods[proof.type].len;
                    slice = [];
                }
                slice.push(proof);
                if (config.proofMethods[proof.type].force) {
                    checkpoints.push(slice);
                    slice = [];
                    len = 0;
                }
            }
            checkpoints.push(slice);
            return checkpoints;
        },
    };
};
/*
backend_1    | [
backend_1    |   '0x5f5f63616c6c6261636b00000000000000000000000000000000000000000000',
backend_1    |   '0x000000000000000000000000dc8f20170c0946accf9627b3eb1513cfd1c0499f',
backend_1    |   '0x0000000000000000000000000000000000000000000000000000000000000851',
backend_1    |   '0x7b22737461747573223a207b225f646f63223a2022737461747573222c20226e',
backend_1    |   '0x616d65223a2022456e646564222c20225f6964223a203130307d2c202277696e',
backend_1    |   '0x64616476616e74616765223a20302c2022746f6265616e6e6f756e636564223a',
backend_1    |   '0x2066616c73652c20225f736561736f6e6964223a2036363838312c20225f7263',
backend_1    |   '0x6964223a20372c20225f736964223a20312c20226f76657274696d656c656e67',
backend_1    |   '0x7468223a2031352c202277656174686572223a206e756c6c2c2022726573756c',
backend_1    |   '0x74223a207b22686f6d65223a20332c202261776179223a20302c202277696e6e',
backend_1    |   '0x6572223a2022686f6d65227d2c20225f746964223a20342c2022666163747322',
backend_1    |   '0x3a20747275652c2022656e6465645f757473223a20313538303539303234332c',
backend_1    |   '0x20225f6474223a207b22747a223a20222b3035222c20225f646f63223a202274',
backend_1    |   '0x696d65222c2022757473223a20313538303538333630302c202274696d65223a',
backend_1    |   '0x202230303a3030222c202264617465223a202230322f30322f3230222c202274',
backend_1    |   '0x7a6f6666736574223a2031383030307d2c20227074696d65223a203135383035',
backend_1    |   '0x39303234332c20227069746368636f6e646974696f6e223a206e756c6c2c2022',
backend_1    |   '0x726f756e646e616d65223a207b225f646f63223a20227461626c65726f756e64',
backend_1    |   '0x222c20226e616d65223a2032322c20225f6964223a2032327d2c202275706461',
backend_1    |   '0x7465645f757473223a20313538303539303836322c2022706572696f646c656e',
backend_1    |   '0x677468223a2034352c20227765656b223a20352c20227374616469756d696422',
backend_1    |   '0x3a20313836362c20225f75746964223a2033342c20226e756d6265726f667065',
backend_1    |   '0x72696f6473223a20322c20225f6d636c696e6b223a20747275652c2022636172',
backend_1    |   '0x6473223a207b22686f6d65223a207b2279656c6c6f775f636f756e74223a2030',
backend_1    |   '0x2c20227265645f636f756e74223a20307d2c202261776179223a207b2279656c',
backend_1    |   '0x6c6f775f636f756e74223a20312c20227265645f636f756e74223a20307d7d2c',
backend_1    |   '0x2022636f766572616765223a207b2273636f7574636f6e6e6563746564223a20',
backend_1    |   '0x747275652c20226c6976657461626c65223a2034323330322c202273636f7574',
backend_1    |   '0x74657374223a2066616c73652c2022746163746963616c6c696e657570223a20',
backend_1    |   '0x747275652c2022646565706572636f766572616765223a20747275652c202269',
backend_1    |   '0x6e6a7572696573223a20312c2022746965627265616b223a206e756c6c2c2022',
backend_1    |   '0x6861737374617473223a20747275652c20226c6d74737570706f7274223a2034',
backend_1    |   '0x2c2022696e6c69766573636f7265223a20747275652c2022666f726d6174696f',
backend_1    |   '0x6e73223a20302c2022737562737469747574696f6e73223a20747275652c2022',
backend_1    |   '0x62616c6c73706f7474696e67223a20747275652c2022616476616e7461676522',
backend_1    |   '0x3a206e756c6c2c20226d65646961636f766572616765223a20747275652c2022',
backend_1    |   '0x62617369636c696e657570223a20747275652c20226c696e657570223a20322c',
backend_1    |   '0x202273636f7574636f766572616765737461747573223a20302c20226d617463',
backend_1    |   '0x6864617461636f6d706c657465223a2066616c73652c202276656e7565223a20',
backend_1    |   '0x66616c73652c20226d756c746963617374223a20747275652c202270656e616c',
backend_1    |   '0x747973686f6f746f7574223a20322c202273636f75746d61746368223a20312c',
backend_1    |   '0x20226c6976656f646473223a20747275652c2022636f726e6572736f6e6c7922',
backend_1    |   '0x3a2066616c73657d2c202272656d6f766564223a2066616c73652c2022686622',
backend_1    |   '0x3a20352e342c202274656d7065726174757265223a206e756c6c2c2022646973',
backend_1    |   '0x74616e6365223a203732322c20225f736b223a2066616c73652c2022706f7374',
backend_1    |   '0x706f6e6564223a2066616c73652c20226c6f63616c6465726279223a2066616c',
backend_1    |   '0x73652c202277616c6b6f766572223a2066616c73652c20226d61746368737461',
backend_1    |   '0x747573223a2022726573756c74222c20225f646f63223a20226d61746368222c',
backend_1    |   '0x20227465616d73223a207b22686f6d65223a207b226861736c6f676f223a2074',
backend_1    |   '0x7275652c20226e616d65223a202244696a6f6e222c20225f736964223a20312c',
backend_1    |   '0x20225f646f63223a20227465616d222c20227669727475616c223a2066616c73',
backend_1    |   '0x652c20226d656469756d6e616d65223a202244696a6f6e2046434f222c202269',
backend_1    |   '0x73636f756e747279223a2066616c73652c20225f6964223a2035373034323731',
backend_1    |   '0x2c20226e69636b6e616d65223a206e756c6c2c202261626272223a202244494a',
backend_1    |   '0x222c2022756964223a20313638367d2c202261776179223a207b226861736c6f',
backend_1    |   '0x676f223a20747275652c20226e616d65223a20224272657374222c20225f7369',
backend_1    |   '0x64223a20312c20225f646f63223a20227465616d222c20227669727475616c22',
backend_1    |   '0x3a2066616c73652c20226d656469756d6e616d65223a20225374616465204272',
backend_1    |   '0x6573746f6973203239222c20226973636f756e747279223a2066616c73652c20',
backend_1    |   '0x225f6964223a20353433323439372c20226e69636b6e616d65223a206e756c6c',
backend_1    |   '0x2c202261626272223a2022535442222c2022756964223a20313731357d7d2c20',
backend_1    |   '0x2270223a202230222c202274696d65696e666f223a207b227374617274656422',
backend_1    |   '0x3a206e756c6c2c2022706c61796564223a206e756c6c2c2022696e6a75727974',
backend_1    |   '0x696d65223a206e756c6c2c2022656e646564223a202231353830353930323433',
backend_1    |   '0x222c202272756e6e696e67223a2066616c73652c202272656d61696e696e6722',
backend_1    |   '0x3a206e756c6c7d2c202263616e63656c6c6564223a2066616c73652c20225f69',
backend_1    |   '0x64223a2031383434303334322c2022726f756e64223a2032322c202277696e64',
backend_1    |   '0x223a206e756c6c2c2022706572696f6473223a207b227031223a207b22686f6d',
backend_1    |   '0x65223a20322c202261776179223a20307d2c20226674223a207b22686f6d6522',
backend_1    |   '0x3a20332c202261776179223a20307d7d7d000000000000000000000000000000'
backend_1    | ]
