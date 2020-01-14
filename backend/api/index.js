const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const _ = require('lodash');

module.exports = (app) => {

    const api = {
        init: () => {
            const expressApp = express();
            const server = http.Server(expressApp);
            const io = socketio(server);

            api.events = {};

            server.listen(8090);
            io.on('connection', socket => api.onConnection(socket));
        },
        unsubscribeFromAll: (socket) => {
            _.forEach(app.events, (socketList, eventKey) => {
                app.events[eventKey] = _.filter(socketList, s !== socket);
            });
        },

        onConnection: (socket) => {
            socket.on('disconnect', () => {
                api.unsubscribeFromAll(socket);
            });

            socket.on('subscribe', (event) => {
                api.events[event] = api.events[event] || [];
                api.events[event].push(socket);
            });

            socket.on('load', (what, params) => {
                if (what === 'sportr') {
                    app.models.sportr.load(params);
                }
                if (what === 'balance') {
                    socket.emit(`balance-${params}`, app.models.snap.getAccountBalance(params));
                }
                if (what === 'categories') {
                    app.models.sportr.getCategoryTree()
                        .then(tree => socket.emit('categories', tree));
                }
                if (what === 'events') {
                    app.models.sportr.getEvents(params)
                        .then(events => socket.emit('events', app.models.sportr.extendByStacks(events)));
                }
                if (what === 'bets') {
                    const bets = app.models.snap.getAccountBets(params);
                    socket.emit(`bets-${params}`, bets);
                }
            });
        },

        fireEvent: (event, data) => {
            _.forEach(api.events[event], socket => socket.emit(event, data));
        },
    };

    app.api = api;
    api.init();
};