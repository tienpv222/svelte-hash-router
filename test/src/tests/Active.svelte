<script context='module'>
import Router, { routes, active } from '../../../src'
import Route1 from '../components/Route1.svelte'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'
import Navigator from '../components/Navigator.svelte'
import Property from '../components/Property.svelte'

export let schema = {
  '/route1': Route1,
  '/route2': {
    $$component: Route2,
    '/route3': Route3
  }
}
</script>

<Navigator route='{$routes[`/`][`active`]}'/>
<div>
  <Property key='href' value={$active.$$href}/>
  <Router deep={true}/>
</div>
