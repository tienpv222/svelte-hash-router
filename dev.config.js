import svelte from 'rollup-plugin-svelte'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import browsersync from 'rollup-plugin-browsersync'

let mode = process.env.MODE || 'dev'

export default {
  input: 'docs/src/index.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: `${build ? 'docs' : test ? 'test' : 'dev'}/bundle.js`
  },
  plugins: [
    svelte({
      dev: !production,
      css: css => css.write('docs/bundle.css')
    }),
    nodeResolve(),
    commonjs(),
    production || browsersync({
      server: 'docs',
      watch: !production,
      ignore: ['docs/src']
    })
  ]
}
