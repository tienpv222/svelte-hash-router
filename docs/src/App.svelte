<script>
import { routes, Router } from '../../src'
import NavItem from './components/NavItem.svelte'

</script>

<div class='nav'>
  <NavItem route='{[$routes[`/`]]}'/>
  <NavItem route='{$routes[`/`]}' deep={true}/>
</div>
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
}

.nav {
  float: left;
  height: 100%;
  padding-top: 10px;
  background: dimgray;
}

.view {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: lightpink;
}
</style>