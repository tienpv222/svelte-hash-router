<script context='module'>
import Router, { routes } from '../../../src'
import Route1 from '../components/Route1.svelte'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'
import Route4 from '../components/Route4.svelte'
import Route5 from '../components/Route5.svelte'
import Route6 from '../components/Route6.svelte'
import Navigator from '../components/Navigator.svelte'

export let schema = {
  '/route1': {
    $$component: Route1,
    '/route2': Route2,
    '/route3': Route3
  },
  '/route4': {
    $$component: Route4,
    '/route5': {
      $$component: Route5,
      '/route6': Route6
    }
  }
}
</script>

<Navigator route='{$routes[`/`][`nested-routes`]}' deep={true} exact={true}/>
<Router deep={true}/>