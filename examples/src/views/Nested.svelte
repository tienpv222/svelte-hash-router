<script context='module'>
import Route1 from '../components/Route1.svelte'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'
import Route4 from '../components/Route4.svelte'
import Route5 from '../components/Route5.svelte'

export let nestedRoutes = {
  '/route1': {
    $$component: Route1,
    '/route3': Route3,
    '/route4': Route4
  },
  '/route2': {
    $$component: Route2,
    '/route5': Route5
  }
}

</script>

<script>
import Route from '../components/Route.svelte'
</script>

<Route name='Nested' deep={true} outline={true}/>
