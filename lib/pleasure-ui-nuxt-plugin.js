import pleasure from 'pleasure-ui-vue'
import Vue from 'vue'

export default function ({ app, store }) {
  console.log(`pleasure`, pleasure, Object.keys(pleasure))
  Vue.use(pleasure, { app, store })
}
