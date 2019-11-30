import Vue from 'vue'
import pleasure from 'pleasure-ui-vue'

export default function ({ app, store }) {
  console.log(`pleasure`, pleasure)
  console.log(`Object.keys(pleasure)`, Object.keys(pleasure))
  Vue.use(pleasure, { app, store })
}
