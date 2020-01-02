import Vue from 'vue'
import { PleasureUiVue } from '@pleasure-js/ui-vue'

export default function ({ app, store }) {
  console.log(`PleasureUiVue`, PleasureUiVue)
  if (PleasureUiVue) {
    console.log(`Object.keys(pleasure)`, Object.keys(PleasureUiVue))
    Vue.use(PleasureUiVue, { app, store })
  }
}
