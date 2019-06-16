<script context='module'>
import Router, { routes } from '../../../src'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'
import Navigator from '../components/Navigator.svelte'

export let schema = {
  '/route1': {
    '/route2': Route2,
    '/route3': Route3
  }
}
</script>

<Navigator route='{$routes[`/`][`without-component`]}' deep={true} exact={true}/>
<Router/>
