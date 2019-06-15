<script>
export let href = ''
export let label = ''
</script>

<a {href}>Goto: {label}</a>

<style>
a {
  display: block;
  margin: 5px;
  padding: 10px;
  color: darkslategray;
  text-decoration: none;
  background: #ffffff88;
  border-radius: 5px;
}

a:hover {
  background: #ffffffdd;
}

a:active {
  background: #ffffffff;
}
</style>