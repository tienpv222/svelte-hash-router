# svelte-hash-router
[![svelte](https://img.shields.io/badge/svelte-v3-blueviolet.svg)](https://github.com/sveltejs/svelte)
[![npm](https://img.shields.io/npm/v/svelte-hash-router.svg)](https://www.npmjs.com/package/svelte-hash-router)
[![Build Status](https://travis-ci.org/pynnl/pug2svelte.svg?branch=master)](https://travis-ci.org/pynnl/pug2svelte)
[![GitHub license](https://img.shields.io/github/license/pynnl/svelte-hash-router.svg)](https://github.com/pynnl/svelte-hash-router/blob/master/LICENSE)
[![Dependencies Status](https://david-dm.org/pynnl/svelte-hash-router.svg)](https://github.com/pynnl/svelte-hash-router)

Simple Svelte 3 hash based router with global routes.

## Install
```
npm i -D svelte-hash-router
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

Then use `Router` inside.
```svelte
<!-- App.svelte -->
<script>
import Router from 'svelte-hash-router'
</script>

<Router/>
```

Or more simple:
```javascript
// index.js
export default new Router({ target: document.body })
```

### Nested routes
```javascript
// schema
{
  '/': {
    $$component: MainLayout,
    'home': Home,
    'networking': {
      $$component: NetworkingLayout,
      '/github': Github,
      '/facebook': Facebook
    }
  },
  '*': NotFound
}
```

Then just simply use `Router` for each level.
```svelte
<!-- MainLayout.svelte -->
<div id='header'></div>

<Router/> <!-- match '/home' and '/networking' -->

<div id='footer'></div>
```

```svelte
<!-- NetworkingLayout.svelte -->
<p>A social networking</p>

<Router/> <!-- match '/networking/github' and '/networking/facebook' -->
```

If `$$component` in the parent is omitted:
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
```
Except that in the first schema, `/` is an individual route, has its own data and can be looped for children routes when needed. See [`routes`](#the-routes-store).

## Schema
Root paths must start with a `/` or if using wildcard, `*`.
```javascript
import { routes, Router } from 'svelte-hash-router'

routes.set({
  '/home': Home,
  '*': NotFound
})

export default new Router({ target: document.body })
```

An object of options can be passed. All properties starting with `$$` will be treated as options, the rest will be seen as nested routes. All options are saved as none-enumerable. `$$component` is a reserved option.
```javascript
{
  '/home': HomeComponent,
  '/about': {
    // options
    $$component: AboutComponent,
    $$name: 'About me',
    $$customOption: 'any',
    
    // nested routes
    '/biography': BiographyComponent,
    '/hobbies': HobbiesComponent 
  }
}
```

### Params
Get params of current active route with the params store.
```javascript
// schema
{
  '/books/:id': BookComponent,
  '/authors/:name/novels/:title': NovelComponent
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
{ '/book/*': BookComponent }

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
    '/github': GithubComponent,
    
    // redirect using string syntax
    '*': '/networking/github'
  },
  
  // redirect using options object
  '*': {
    $$redirect: '/home'
  }
}

```

## The `routes` store
After the first schema setup, `routes` becomes readonly. The following reserved properties are added for each route:

- `$$pathname` the exact path as in schema define
- `$$href` full path including `#` at the beginning
- `$$stringify` a function to generate string from params. Check out [url-pattern stringify](https://github.com/snd/url-pattern#stringify-patterns)
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

The store `active` is the current active route. If you want to check if a parent route has an active child route, use the store `matches`. It is an array including all the parents of the active route and itself.
```svelte
<script>
import { matches } from 'svelte-hash-router'
</script>

<a class:active={$matches.includes(route)}></a>
```

A route containing params can be stringified.
```svelte
<!-- schema: '/book/:id/:name' -->
<a href='{route.$$stringify({id: 123, name: `Dreams`})}'>

<!-- will give: '/book/123/Dreams' -->
```

### [CHANGELOG](CHANGELOG.md)

### [LICENSE: MIT](LICENSE.md)
