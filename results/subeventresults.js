const { subeventsReverse } = require('./subevents');

const axios = require('axios');
const _ = require('lodash');

const isFinished = (event) => ([100, 110, 120, 125].indexOf(parseInt(event.status)) >= 0);
const sportHasDraw = (sport) => (['Soccer'].indexOf(sport) >= 0);
// const sports = [1, 2, 4, 5];
const sports = [1, 2, 4, 5];
// const countryWhitelist = ['Belarus'];
// const sports = [160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172];
const countryWhitelist = [
    'Belarus',
    'England',
    'France',
    'Germany',
    'International',
    'International Clubs',
    'Italy',
    'Netherlands',
    'Portugal',
    'Russia',
    'Spain',
    'Ukraine',
    // 'USA',
    'ATP',
    'WTA',
];

const ex = {
    convertPlaneToStruct: (eventAsPlane) => {
        return {
            ...eventAsPlane,
            teams: JSON.parse(eventAsPlane.teams),
        };
    },
    getEventResultsFromStruct: (event) => {
        results = {};
        results[subeventsReverse.t1] = isFinished(event) ? (event.teams[0].ft > event.teams[1].ft) : null;
        results[subeventsReverse.t2] = isFinished(event) ? (event.teams[0].ft < event.teams[1].ft) : null;
        results[subeventsReverse.draw] = (!isFinished(event) || !sportHasDraw(event.sport)) ? null : (event.teams[0].ft === event.teams[1].ft);
        return results;
    },
    getEventResultsFromPlane: (event) => {
        return ex.getEventResultsFromStruct(ex.convertPlaneToStruct(event));
    },
    findEventIdx: async (event) => {
        const data = {};
        await ex.importForDate(event.date, data, event.sportId);
        return data[event.external_id];
    },
    importForDate: async (date, data, filterSport) => {
        for (let sportIdx = 0; sportIdx < sports.length; sportIdx++) {
            if (filterSport && (filterSport != sports[sportIdx])) {
                continue;
            }
            const apiRequest = await axios.get(`https://ls.fn.sportradar.com/winline/en/Asia:Yekaterinburg/gismo/sport_matches/${sports[sportIdx]}/${date}/0`)
                .catch((e) => { console.log('error in sports parse', e) });
            if (apiRequest && apiRequest.data && apiRequest.data.doc && apiRequest.data.doc[0]) {
                const sportName = apiRequest.data.doc[0].data.sport.name;
                _.forEach(apiRequest.data.doc[0].data.sport.realcategories, (country, countryId) => {
                    const countryName = country.name;
                    if (countryWhitelist.indexOf(countryName) >= 0)
                    {
                        _.forEach(country.tournaments, (league, leagueId) => {
                            const leaugueName = league.name;
                            _.forEach(league.matches, (match, matchId) => {
                                const teamInfo = _.map(['home', 'away'], teamId => {
                                    return {
                                        name: match.teams[teamId].mediumname,
                                        score: match.result[teamId] || 0,
                                        ..._.mapValues(match.periods, val => (val && val[teamId]) || 0),
                                    }
                                });

                                const external_id = match._id;
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
                                    date,
                                    matchId,
                                    leagueId,
                                    countryId,
                                    sportId: sports[sportIdx],
                                };
                            });
                        });
                    }
                });
            }
        }
    },

};

module.exports = ex;
