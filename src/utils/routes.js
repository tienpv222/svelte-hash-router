import UrlPattern from 'url-pattern'
import { writable, derived } from 'svelte/store'

function defineProp (obj, prop, value) {
  Object.defineProperty(obj, prop, { value })
}

// Parse schema into routes
function parse (schema = {}, notRoot, pathname, href = '#') {
  // Convert schema to options object. Schema can be:
  // + function: Svelte component
  // + string: redirect path
  // + object: options
  if (notRoot) {
    let type = typeof schema
    schema = type === 'function' ? { $$component: schema }
      : type === 'string' ? { $$redirect: schema }
      : (type !== 'object' || schema === null) ? {} : schema

    let c = schema.$$component
    if (typeof c !== 'function' && c !== undefined && c !== null)
      throw new Error('Invalid Svelte component')
  }

  // Any properties not starting with $$ will be treated as routes,
  // the rest will be kept as route data. Custom data is also kept,
  // but will be replaced with internal data if duplicating names.
  let route = {}
  for (let i in schema) {
    if (/^\$\$/.test(i))
      defineProp(route, i, schema[i])
    else
      route[i] = parse(schema[i], true, i, href + i)
  }

  // Define internal data
  if (notRoot) {
    defineProp(route, '$$href', href) // full path including #
    defineProp(route, '$$pathname', pathname) // scoped path
    defineProp(route, '$$pattern', new UrlPattern(href))
    defineProp(route, '$$stringify', v => route.$$pattern.stringify(v))
  }

  return Object.freeze(route)
}

// Routes store must be set before creating any Svelte components.
// It can only be set once. A parsed version is created after with
// helpful internal data
let schema = writable()
let routes = derived(schema, $ => parse($))
routes.set = v => {
  schema.set(v)
  delete routes.set
}

export { routes }
