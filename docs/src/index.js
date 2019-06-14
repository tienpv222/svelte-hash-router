import { routes, Router } from '../../src'
import App from './App.svelte'
import Basic, { basicRoutes } from './views/Basic.svelte'
import Nested, { nestedRoutes } from './views/Nested.svelte'
import Wildcard, { wildcardRoutes } from './views/Wildcard.svelte'
import Params, { paramsRoutes } from './views/Params.svelte'
import Query from './views/Query.svelte'
import Redirect from './views/Redirect.svelte'

routes.set({
  '/': {
    $$component: App,
    'basic': { $$component: Basic, ...basicRoutes },
    'nested': { $$component: Nested, ...nestedRoutes },
    'wildcard': { $$component: Wildcard, ...wildcardRoutes },
    'params': { $$component: Params, ...paramsRoutes },
    'query': Query,
    'redirect': Redirect
  },
  '*': '/redirect'
})

let app = new Router({
  target: document.body
})

export default app
