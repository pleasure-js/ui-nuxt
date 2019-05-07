import VueI18n from 'vue-i18n'
import castArray from 'lodash/castArray'
import forEach from 'lodash/forEach'
import Vue from 'vue'

Vue.use(VueI18n)

export default ({ app, store }) => {
  if (!store) {
    throw new Error(`Please initialize nuxt vuex store`)
  }
  // Set i18n instance on app
  // This way we can use it in middleware and pages asyncData/fetch
  app.i18n = new VueI18n({
    locale: store.state.locale,
    fallbackLocale: 'en',
    messages: process.env.$pleasure.locales
  })

  app.i18n.path = (link) => {
    if (app.i18n.locale === app.i18n.fallbackLocale) {
      return `/${ link }`
    }

    return `/${ app.i18n.locale }/${ link }`
  }

  Vue.mixin({
    methods: {
      plsi18n (v, def) {
        if (!v) {
          return def ||  v
        }

        v = castArray(v)
        let found = def || v[0]

        forEach(v, alt => {
          const guess = this.$t(alt)
          if (guess && typeof guess === 'string' && guess !== alt) {
            found = guess
            return false
          }
        })

        return found
      }
    }
  })
}
