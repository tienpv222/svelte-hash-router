import { readable, derived } from 'svelte/store'

let regex = /(#?[^?]*)?(\?.*)?/

function parse () {
  let match = regex.exec(window.location.hash)
  let pathname = match[1] || '#/'
  let querystring = match[2]
  return { pathname, querystring }
}

let path = readable(parse(), set => {
  let update = () => set(parse())
  window.addEventListener('hashchange', update)
  return () => window.removeEventListener('hashchange', update)
})

let pathname = derived(path, $ => $.pathname) // current pathname without query
let querystring = derived(path, $ => $.querystring)
let query = derived(querystring, $ => {
  return Array.from(new URLSearchParams($))
    .reduce((a, [i, e]) => { a[i] = e; return a }, {})
})

export { pathname, query }
