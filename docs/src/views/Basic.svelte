<script context='module'>
import Route1 from '../components/Route1.svelte'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'

export let basicRoutes = {
  '/route1': Route1,
  '/route2': Route2,
  '/route3': Route3
}
</script>

<script>
import Route from '../components/Route.svelte'
</script>

<Route name='Basic' deep={true}/>
