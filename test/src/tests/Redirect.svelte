<script context='module'>
import Router, { routes } from '../../../src'
import Route1 from '../components/Route1.svelte'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'
import Navigator from '../components/Navigator.svelte'

export let schema = {
  '/route1': Route1,
  '/route2': Route2,
  '/route3': Route3,
  '/route4': '/redirect/route1',
  '/route5': { $$redirect: '/redirect/route2' },
  '*': '/redirect/route3'
}
</script>

<Navigator route='{$routes[`/`][`redirect`]}'/>
<Router/>
