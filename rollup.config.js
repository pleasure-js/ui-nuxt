const commonjs = require('rollup-plugin-commonjs')
const vue = require('rollup-plugin-vue')

module.exports = {
  input: 'src/nuxt-pleasure.js',
  output: [
    {
      file: 'dist/nuxt-pleasure.js',
      format: 'cjs'
    },
    {
      file: 'dist/nuxt-pleasure.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    vue()
  ]
}
