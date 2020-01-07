const dbInit = require('./db');
const apiInit = require('./api');
const scannerInit = require('./scanner');
const daemonInit = require('./daemon');

const main = async () => {
    const db = await dbInit();
    apiInit({db});
    scannerInit({db});
    daemonInit({db});
};

main();
