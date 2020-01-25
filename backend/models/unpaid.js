const _ = require('lodash');
const config = require('../config');

module.exports = (app) => {
    const unpaid = {
        events2fetch: {},
        onEventChanged: (event) => {
            _.forEach(event.results, (result, subevent) => {
                if ((result === true) || (result === false)) {
                    const eventKey = `${event.external_id}-${subevent}`;
                    const bets = _.map(app.models.snap.currentState.betsByEvents[eventKey], betid => app.models.snap.currentState.allBets[betid - 1]);
                    const betsUnpaid = _.filter(bets, bet => !bet.paid);
                    if (betsUnpaid && betsUnpaid.length && !event.fetchResult) {
                        unpaid.events2fetch[event.external_id] = true;
                    }
                }
            });
        },
    };
    app.models.unpaid = unpaid;
};

