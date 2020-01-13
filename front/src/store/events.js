export default {
    state: {
        eventFilter: {},
    },
    mutations: {
        setEventFilter: (state, val) => { state.eventFilter = val; console.log(val); },
    },
    actions: {
        loadEventsForFilter({ commit }, filter) {
            commit('setEventFilter', filter);
        },
    }
};