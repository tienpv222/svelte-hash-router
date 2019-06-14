# svelte-hash-router
Inspired from [svelte-spa-router](https://github.com/ItalyPaleAle/svelte-spa-router), but with global routes.

## Install
```
npm i -D svelte-hash-router@latest
```

## Usage
First, set the `routes` schema before the root component.
```javascript
// index.js
import { routes } from 'svelte-hash-router'
import App from './App.svelte'
import Home from './Home.svelte'
import About from './About.svelte'

routes.set({
  '/home': Home,
  '/about': About 
})

export default new App({ target: document.body })
```

Then use `Router` inside your components.
```svelte
<!-- App.svelte -->
<script>
import { Router } from 'svelte-hash-router'
</script>

<Router/>
```

### Nested routes
```javascript
// schema
{
  '/': {
    $$component: MainLayout,
    'home': Home,
    'networking': {
      $$component: Layout,
      '/github': Github,
      '/facebook': Facebook
    }
  },
  '*': NotFound
}
```

Then just simply use `Router` for each levels. The parent components won't be re-rendered when switching between children routes.
```svelte
<!-- MainLayout.svelte -->
<div id='header'></div>

<Router/> <!-- will match '/home' and '/networking' -->
<div id='footer'></div>

<!-- Layout.svelte -->
<p>A social networking</p>
<Router/> <!-- will match '/networking/github' and '/networking/facebook' -->
```

Each nested level consumes a `Router`. They only render neccessary routes once, so you can freely use them without worrying that will break your app.
```svelte
<!-- Layout.svelte -->
<p>A social networking</p>
<Router/> <!-- this will be rendered when the route is active -->
<Router/> <!-- this will not -->
<Router/> <!-- same -->
```

## Schema
Root paths must start with a `/` or if using wildcard, `*`.
```javascript
import { routes, Router } from 'svelte-hash-router'

route.set({
  '/home': Home,
  '*': NotFound
})

export default new Router({ target: document.body })
```

An object of options can be passed. All properties starting with `$$` will be treated as data, the rest will be seen as nested routes. All data are saved as none-enumerable. `$$component` is a reserved data.
```javascript
{
  '/home': Home,
  '/about': {
    $$component: About,
    $$name: 'About me',
    $$customData: '',
    '/biography': Biography,
    '/hobbies': Hobbies 
  }
}
```

### Omit `$$component`
The component can be omitted, but the route won't be rendered when it is active.
```javascript
{ '/this-route-will-not-be-rendered': null }
```

Nested routes.
```javascript
// schema
{
  '/': {
    'home': Home,
    'about': About
  }
}

// will consume the as amount of <Router> as
{
  '/home': Home,
  '/about': About
}

// except that '/' in the first schema is an individual
// route, have its own data and can be looped for
// children routes when needed
```

### Params
Get params of current active route with the params store.
```javascript
// schema
{
  '/books/:id': null,
  '/authors/:name/novels/:title': null
}

// Svelte component
import { params } from 'svelte-hash-router'

// /books/123
$params.id === '123'

// /authors/John/novels/Dreams
$params.name === 'John'
$params.title === 'Dreams'

```

Same with query.
```javascript
// Svelte component
import { query } from 'svelte-hash-router'

// /book?id=123&title=Dreams
$query.id === '123'
$query.title === 'Dreams'
```

### Wildcard
__*The order of schema does matter*__. Whichever route matching first will be rendered. Wildcard `*` matches anything, so it is usually put at the end. Wilcard is collected in `params` as `_`.
```javascript
// schema
{ '/book/*': null }

// /book/123?title=Dreams
$params._ === '123' // not catch query
```

### url-pattern
This library uses the nice package [url-pattern](https://github.com/snd/url-pattern), check it out for more syntaxes.

## Redirect
Redirect routes by using a string instead of a Svelte component, or if passing options object, use `$$redirect`. The redirect path must be an asbolute path.
```javascript
{
  '/home': Home,
  '/networking': {
    '/github': Github,
    '*': '/networking/github'
  },
  '*': {
    $$redirect: '/home'
  }
}

```

## The `routes` store
After the first schema setup, `routes` becomes readonly. The following reserved properties are added:

- `$$pathname` the exact path as in schema define
- `$$href` full path including `#` at the beginning
- `$$stringify` generate string from params. Check out [url-pattern stringify](https://github.com/snd/url-pattern#stringify-patterns)
- `$$pattern` url-pattern object

Since they are __*non-enumarable*__, you can easily loop for just nested routes when needed.
```svelte
<!-- Navigator.svelte -->
<script>
import { routes, active } from 'svelte-hash-router'

$: links = Object.values($routes['/books']['/comedy'])
</script>

{#each links as e}
  <a
    class:active={e === $active}
    href={e.$$href}
    > {e.$$name}
  </a>
{/each}

<style>
.active { color: blue; }
</style>
```

The store `active` contains the current active route. If you use nested routes and want to check if a parent route has an active child route, use `matches`. It includes all the parents of the active route and itself.
```svelte
<a class:active={$matches.includes(route)}></a>
```

A route containing params can be stringified.
```svelte
<!-- schema: '/book/:id/:name' -->
<a href='{route.$$stringify({id: 123, name: `Dreams`})}'>

<!-- will give: '/book/123/Dreams' -->
```

## LICENSE
MIT
