import Vue from 'vue'
import { UiVue } from '@pleasure-js/ui-vue'

export default function ({ app, store }) {
  console.log(`UiVue`, UiVue)
  if (UiVue) {
    console.log(`Object.keys(pleasure)`, Object.keys(UiVue))
    Vue.use(UiVue, { app, store })
  }
}
