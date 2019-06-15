<script>
import { routes, Router } from '../../src'
import Navigator from './components/Navigator.svelte'
</script>

<Navigator route='{$routes[`/`]}'/>
<div class='view'>
  <Router/>
</div>

<style>
:global(*) {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Courier New', Courier, monospace;
}

:global(body) {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.view {
  display: flex;
  height: 100%;
  border-left: 1px solid gray;
}
</style>