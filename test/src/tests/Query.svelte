<script context='module'>
import Router, { query } from '../../../src'
import Property from '../components/Property.svelte'
</script>

<div>
  {#each Object.entries($query) as e}
    <Property key={e[0]} value={e[1]}/>
  {/each}
  <Router/>
</div>
