# WIP
# svelte-hash-router
Inspired from [svelte-spa-router](https://github.com/ItalyPaleAle/svelte-spa-router), but with global routes.

## Install
```
npm i -D svelte-hash-router
```

## Usage
First, set up `routes` schema before the root component.
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

The component can be omitted, but the route won't be rendered.
```javascript
{ '/this-route-will-not-be-rendered': null }
```

An object of options can be passed. All properties starting with `$$` will be treated as data, the rest will be seen as nested routes.
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

Custom data will be overrided with similar named internal data.

### Params
Get params of current route with the params store.
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
__*The order of schema does matter*__. The route matching first will be rendered. Wildcard `*` matches anything, so it is usually at the end. Wilcard is collected in `params` as `_`.
```javascript
// schema
{ '/book/*': null }

// /book/123?title=Dreams
$params._ === '123' // not catch query
```

### url-pattern
This library use [url-pattern](https://github.com/snd/url-pattern), check it out for more syntaxes.

## Nested routes
```javascript
// schema
{
  '/': {
    $$component: MainLayout,
    'home': Home,
    'networking': {
      $$component: Layout,
      'github': Github,
      'facebook': Facebook
    }
  },
  '*': NotFound
}
```

```svelte
<!-- MainLayout -->
<div id='header'></div>
<Router/>
<div id='footer'></div>

<!-- Layout -->
<p>A social networking</p>
<Router/>
```

Omitted component:
```javascript
// schema
{
  '/': {
    'home': Home,
    'about': About
  }
}

// will act the same as
{
  '/home': Home,
  '/about': About
}

// except that '/' in the first schema is
// an individual route, have its own data
// and can be looped
```

## Redirect
The redirect path must be an asbolute path
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
After the first schema setup, `routes` becomes readonly. The following __*non-enumarable*__ properties are added:

- `$$pathname` the exact path as in schema define
- `$$href` full path including `#` at the beginning
- `$$stringify` generate string from params. Check out [url-pattern stringify](https://github.com/snd/url-pattern#stringify-patterns)
- `$$pattern` url-pattern object

Example of use:
```svelte
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

`active` stores the current active route. To include the parents of active route as well, use `matches`.
```svelte
<a class:active={$matches.includes(route)}></a>
```

A route containing params can be stringified.
```svelte
<a href='{route.$$stringify({id: 123, name: `Dreams`})}'>
```

## LICENSE
MIT
