const config = require('../config');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');

const importForDate = async (date, app) => {
    const data = {};
    for (let sportIdx = 0; sportIdx < config.sports.length; sportIdx++) {
        const apiRequest = await axios.get(`https://ls.fn.sportradar.com/winline/en/Asia:Yekaterinburg/gismo/sport_matches/${config.sports[sportIdx]}/${date}/0`);
        if (apiRequest && apiRequest.data && apiRequest.data.doc && apiRequest.data.doc[0]) {
            const sportName = apiRequest.data.doc[0].data.sport.name;
            _.forEach(apiRequest.data.doc[0].data.sport.realcategories, country => {
                const countryName = country.name;
                if (config.countryWhitelist.indexOf(countryName) >= 0) {
                    _.forEach(country.tournaments, league => {
                        const leaugueName = league.name;
                        _.forEach(league.matches, match => {
                            const teamInfo = _.map(['home', 'away'], teamId => {
                                return {
                                    name: match.teams[teamId].mediumname,
                                    score: match.result[teamId] || 0,
                                    ..._.mapValues(match.periods, val => (val && val[teamId]) || 0),
                                }
                            });

                            const external_id = `sportr:${match._id}`;
                            data[match._id] = {
                                sport: sportName,
                                country: countryName,
                                league: leaugueName,
                                external_id,
                                timestamp: match._dt.uts,
                                status: match.status._id,
                                updated_at: match.updated_uts,
                                ptime: match.ptime,
                                ended: match.ended_uts,
                                teams: teamInfo,
                            };
                        });
                    });
                }
            });
        }
    }
    const keys = _.keys(data);
    for (let i = 0; i < keys.length; i++) {
        await app.models.sportr.createOrUpdate(data[keys[i]]);
    }
};


const importAll = async (app) => {
    const data = {};
    for (let i = -7; i <= 7; i++) {
        const scanDate = moment().add(i, 'd').format('YYYY-MM-DD');
        console.log(scanDate);
        await importForDate(scanDate, app);
    }
}

module.exports = (app) => {
    importAll(app);
};