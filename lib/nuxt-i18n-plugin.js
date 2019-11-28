import Vue from 'vue'
import VueI18n from 'vue-i18n'
import castArray from 'lodash/castArray'
import forEach from 'lodash/forEach'

Vue.use(VueI18n)

export default ({ app, store }) => {
  if (!store) {
    throw new Error(`Please initialize nuxt vuex store`)
  }

  const messages = process.env.$pleasure.locales
  // console.log(`store.state.locale`, store.state.locale)

  // console.log(`setting up i18n with`, { messages })
  // Set i18n instance on app
  // This way we can use it in middleware and pages asyncData/fetch
  app.i18n = new VueI18n({
    locale: store.state.locale || 'en',
    fallbackLocale: 'en',
    messages
  })

  const { i18n } = app

  // console.log(i18n)

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
          return def || v
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
