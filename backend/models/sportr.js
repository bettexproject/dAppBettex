const _ = require('lodash');

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

            record.teams = JSON.stringify(params.teams);

            await record.save();
            app.models.sportr.notifyChange(record);
        },
        extendByStacks: (records) => {
            const inputArray = Array.isArray(records) ? records : [records];
            const outputArray = _.map(inputArray, record => {
                return record ? {
                    ...record.toObject ? record.toObject() : record,
                    stacks: app.models.snap.getEventStacks(record.external_id),
                } : {};
            });

            return Array.isArray(records) ? outputArray : outputArray[0];
        },

        getEventsByBets: async (bets) => {
            const events = {};
            _.forEach(bets, bet => events[bet.eventid] = true);
            const idsKeys = _.keys(events);
            for (let i = 0; i < idsKeys.length; i++) {
                events[idsKeys[i]] = await sportrModel.findOne({ external_id: idsKeys[i]});
            }
            return _.values(events);
        },

        notifyChange: (record) => {
            if (app.api.fireEvent) {
                const updateEvent = {
                    update: 'sportr',
                    data: app.models.sportr.extendByStacks(record),
                };
                app.api.fireEvent(`onChange sport ${record.sport}`, updateEvent);
                app.api.fireEvent(`onChange country ${record.sport}-${record.country}`, updateEvent);
                app.api.fireEvent(`onChange league ${record.sport}-${record.country}-${record.league}`, updateEvent);
                app.api.fireEvent(`onChange event ${record.external_id}`, updateEvent);
            }
        },
        notifyChangeById: async (eventid) => {
            const record = await sportrModel.findOne({ external_id: eventid });
            if (record) {
                app.models.sportr.notifyChange(record);
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
