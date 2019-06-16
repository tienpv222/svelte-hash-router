<script>
import { routes } from '../../../src'
let err = ''
let route = $routes['/']['freeze-routes']

try {
  route.$$pathname = 'changed'
} catch (e) { err = e }
</script>

<div>
  <div class='catch'>{err}</div>
  <div class='pathname'>{route.$$pathname}</div>
</div>

<style>
div {
  margin: 5px 10px;
  font-size: 20px;
}
</style>