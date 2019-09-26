const { parsePostCss } = require('..')
const { mapKeys, kebabCase } = require('lodash')
const dot = require('dot-object')
const variables = mapKeys(dot.dot(require('../../pleasure-ui-vue/postcss.variables.js')), (v, k) => kebabCase(k).replace(/-default$/, ''))

const path = require('path')

parsePostCss(path.resolve(__dirname, '../../pleasure-ui-vue/src/element-ui/element-ui.pcss'), path.join(__dirname, 'main.css'), { variables })
