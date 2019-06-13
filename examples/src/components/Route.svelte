<script>
import { fade } from 'svelte/transition'
import { Router } from '../../../src'
export let name
export let deep = false
export let outline = false
</script>
<div class='route' class:outline in:fade>
  <div>{name}</div>
  {#if deep}
    <Router {deep} {outline}/>
  {/if}
</div>

<style>
.route {
  margin: 10px 0;
  font-size: 20px;
  text-align: center;
}

.outline {
  margin: 5px 5px 5px 5px;
  padding: 5px 10px;
  border: 1px solid black;
}

</style>
