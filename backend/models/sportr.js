const _ = require('lodash');
const { getEventResultsFromStruct } = require('../subeventresults');
const { subeventsReverse } = require('../subevents');

module.exports = (app) => {
    const sportrSchema = new app.mongoose.Schema({
        external_id: {
            type: String,
            unique: true,
        },
        sport: String,
        country: String,
        league: String,

        timestamp: Number,
        updated_at: Number,

        status: Number,

        ptime: Number,
        ended: Number,

        teams: String,
        results: String,

        date: String,
        sportId: Number,

        fetchResultBlock: Number,
        fetchResultData: String,

        callbackResultBlock: Number,
    });


    sportrSchema.index({ sport: 1 });
    sportrSchema.index({ sport: 1, country: 1 });
    sportrSchema.index({ sport: 1, country: 1, league: 1 });
    sportrSchema.index({ timestamp: 1 });

    const sportrModel = app.mongoose.model('Sportr', sportrSchema);

    app.models.sportr = {
        createOrUpdate: async (params) => {
            const record = (await sportrModel.findOne({ external_id: params.external_id })) || (new sportrModel({ external_id: params.external_id }));

            // return if not changed
            if (record.updated_at === params.updated_at) {
                return;
            }

            record.updated_at = params.updated_at;

            record.sport = params.sport;
            record.country = params.country;
            record.league = params.league;

            record.timestamp = params.timestamp;
            record.status = params.status;

            record.ptime = params.ptime;
            record.ended = params.ended;

            record.date = params.date;
            record.sportId = params.sportId;

            record.teams = JSON.stringify(params.teams);
            record.results = JSON.stringify(getEventResultsFromStruct(params));

            // _.forEach(params.results, (result, memo) =>
            //     app.models.snap.updateResultByEvent(record.external_id, subeventsReverse[memo], result));

            await record.save();
            app.models.sportr.notifyChange(record);
        },
        extendByStacksAndResults: (records) => {
            const inputArray = Array.isArray(records) ? records : [records];
            const outputArray = _.map(inputArray, record => {
                if (!record) {
                    return {};
                }
                const r = record && record.toObject ? record.toObject() : record;
                return record ? {
                    ...r,
                    teams: r.teams ? JSON.parse(r.teams) : null,
                    stacks: app.models.snap.getEventStacks(r.external_id),
                    results: r.results ? JSON.parse(r.results) : null,
                } : {};
            });

            return Array.isArray(records) ? outputArray : outputArray[0];
        },

        updateFetchResultBlock: async (external_id, resultBlock) => {
            const record = await sportrModel.findOne({ external_id });
            if (record) {
                record.fetchResultBlock = resultBlock;
                record.fetchResultData = null;
                await record.save();
            }
        },

        updateEventResultProof: async (external_id, result) => {
            const record = await sportrModel.findOne({ external_id });
            if (record) {
                record.fetchResultData = result;
                await record.save();
            }
        },

        getPendingEventProofs: async () => {
            return await sportrModel.find({ fetchResultBlock: { $ne: null }, fetchResultData: { $eq: null } });
        },

        getUnfetchedProofs: async () => {
            const matchedUnpaid = app.models.snap.getMatchedUnpaidSubevents();
            const eventsH = {};
            _.forEach(matchedUnpaid, (d, i) => eventsH[(i.split('-'))[0]] = true);
            const events = _.keys(eventsH);
            const ret = {};
            for (let i = 0; i < events.length; i++) {
                const record = await sportrModel.findOne({ external_id: events[i] });
                if (record && !record.fetchResultBlock) {
                    const extendedRecord = app.models.sportr.extendByStacksAndResults(record);
                    _.forEach(extendedRecord.results, (result, subevent) => {
                        if ((result === true) || (result === false)) {
                            const eventKey = `${record.external_id}-${subevent}`;
                            if (matchedUnpaid[eventKey]) {
                                ret[extendedRecord.external_id] = true;
                            }
                        }
                    });
                }
            }
            return _.keys(ret);
        },

        // getUnpaidFinishedBets: async () => {
        //     const matchedUnpaid = app.models.snap.getMatchedUnpaidSubevents();
        //     const eventsH = {};
        //     _.forEach(matchedUnpaid, (d, i) => eventsH[(i.split('-'))[0]] = true);
        //     const events = _.keys(eventsH);
        //     const eventkeys = {};
        //     for (let i = 0; i < events.length; i++) {
        //         const record = await sportrModel.findOne({ external_id: events[i] });
        //         if (record && record.callbackResultBlock) {
        //             const extendedRecord = app.models.sportr.extendByStacksAndResults(record);
        //             _.forEach(extendedRecord.results, (result, subevent) => {
        //                 if ((result === true) || (result === false)) {
        //                     const eventKey = `${record.external_id}-${subevent}`;
        //                     if (matchedUnpaid[eventKey]) {
        //                         eventkeys[extendedRecord.external_id] = true;
        //                     }
        //                 }
        //             });
        //         }
        //     }
        //     _.forEach(eventkeys, (d, eventKey) => {

        //     });
        // },

        getEventsByBets: async (bets) => {
            const events = {};
            _.forEach(bets, bet => events[bet.eventid] = true);
            const idsKeys = _.keys(events);
            for (let i = 0; i < idsKeys.length; i++) {
                events[idsKeys[i]] = await sportrModel.findOne({ external_id: idsKeys[i] });
            }
            return _.values(events);
        },

        findById: async (eventid) => {
            return await sportrModel.findOne({ external_id: eventid });
        },

        notifyChange: (record) => {
            const extendedRecord = app.models.sportr.extendByStacksAndResults(record);
            if (app.api.fireEvent) {
                const updateEvent = {
                    update: 'sportr',
                    data: extendedRecord,
                };
                app.api.fireEvent(`onChange sport ${record.sport}`, updateEvent);
                app.api.fireEvent(`onChange country ${record.sport}-${record.country}`, updateEvent);
                app.api.fireEvent(`onChange league ${record.sport}-${record.country}-${record.league}`, updateEvent);
                app.api.fireEvent(`onChange event ${record.external_id}`, updateEvent);
            }
            if (app.models.unpaid && app.models.unpaid.onEventChanged) {
                app.models.unpaid.onEventChanged(extendedRecord);
            }
        },
        notifyChangeById: async (eventid) => {
            const record = await sportrModel.findOne({ external_id: eventid });
            if (record) {
                app.models.sportr.notifyChange(record);
                console.log('notify change');
            }
        },
        getCategoryTree: async () => {
            const tree = {};
            const allData = await sportrModel.find();
            _.forEach(allData, item => {
                const country = item.country;
                const sport = item.sport;
                const league = item.league;

                tree[sport] = tree[sport] || { sport, countries: {} };
                tree[sport].countries[country] = tree[sport].countries[country] || { country, leagues: {} };
                tree[sport].countries[country].leagues[league] = tree[sport].countries[country].leagues[league] || { league };
            });
            return tree;
        },
        getEvents: async ({ sport, country, league }) => {
            const filter = {};
            sport && (filter.sport = sport);
            country && (filter.country = country);
            league && (filter.league = league);
            return await sportrModel.find(filter);
        },
    };
};
