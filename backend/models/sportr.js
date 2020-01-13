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
            if (app.api.fireEvent) {
                const updateEvent = { update: 'sportr', data: record };
                app.api.fireEvent(`onChange sport ${params.sport}`, updateEvent);
                app.api.fireEvent(`onChange country ${params.sport}-${params.country}`, updateEvent);
                app.api.fireEvent(`onChange league ${params.sport}-${params.country}-${params.league}`, updateEvent);
                app.api.fireEvent(`onChange event ${params.external_id}`, updateEvent);
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
