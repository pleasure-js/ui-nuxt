import pleasure from 'pleasure-ui-vue'
import Vue from 'vue'

export default function ({ app, store }) {
  Vue.use(pleasure, { app, store })
}
