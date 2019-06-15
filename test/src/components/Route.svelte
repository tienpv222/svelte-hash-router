<script>
import { Router } from '../../../src'
export let id
export let deep = false

</script>
<div class='route'>
  <div>{id}</div>
  {#if deep}
    <Router {deep}/>
  {/if}
</div>

<style>
.route > *:first-child {
  margin: 10px 20px;
  font-size: 20px;
}
</style>
