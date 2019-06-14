import svelte from 'rollup-plugin-svelte'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import browsersync from 'rollup-plugin-browsersync'

export default {
  input: 'test/src/index.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'test/bundle.js'
  },
  plugins: [
    svelte({
      dev: true,
      css: css => css.write('test/bundle.css')
    }),
    nodeResolve(),
    commonjs(),
    browsersync({
      server: 'docs',
      watch: true,
      ignore: ['docs/src']
    })
  ]
}
