import svelte from 'rollup-plugin-svelte'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import browsersync from 'rollup-plugin-browsersync'

export default {
  input: 'dev/src/index.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'dev/bundle.js'
  },
  plugins: [
    svelte({
      dev: true,
      css: css => css.write('docs/bundle.css')
    }),
    nodeResolve(),
    commonjs(),
    browsersync({
      server: 'dev',
      watch: true,
      ignore: ['dev/src']
    })
  ]
}
