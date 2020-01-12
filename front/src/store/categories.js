export default {
    state: {
        categories: {},
    },
    mutations: {
        onCategories: (state, val) => state.categories = val,
    },
    getters: {
        getCategories: state => state.categories,
    }
}