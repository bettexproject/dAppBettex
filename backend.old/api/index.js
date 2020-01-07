const express = require('express');
const userAPI = require('./user');

module.exports = ({db}) => {
    const user = userAPI({db});

    const routes = [
        ['get', '/balance/:address', user.getBalance],
        ['get', '/deposit-history/:address', user.getDepositHistory],
    ];

    const app = new express();
    routes.forEach(route => {
        app[route[0]](route[1], async (req, resp) => {
            try {
                resp.send({
                    success: true,
                    result: await route[2](req, resp),
                });
            } catch (e) {
                resp.send({ success: false, error: e });
            }
        });
    });

    app.listen(8080);
    return app;
}