var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(component, store, callback) {
        const unsub = store.subscribe(callback);
        component.$$.on_destroy.push(unsub.unsubscribe
            ? () => unsub.unsubscribe()
            : unsub);
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? requestAnimationFrame : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.shift()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            while (render_callbacks.length) {
                const callback = render_callbacks.pop();
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_render);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_render.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    let outros;
    function group_outros() {
        outros = {
            remaining: 0,
            callbacks: []
        };
    }
    function check_outros() {
        if (!outros.remaining) {
            run_all(outros.callbacks);
        }
    }
    function on_outro(callback) {
        outros.callbacks.push(callback);
    }
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick: tick$$1 = noop, css } = config;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick$$1(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now$$1 => {
                if (running) {
                    if (now$$1 >= end_time) {
                        tick$$1(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now$$1 >= start_time) {
                        const t = easing((now$$1 - start_time) / duration);
                        tick$$1(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_render } = component.$$;
        fragment.m(target, anchor);
        // onMount happens after the initial afterUpdate. Because
        // afterUpdate callbacks happen in reverse order (inner first)
        // we schedule onMount callbacks before afterUpdate callbacks
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_render.forEach(add_render_callback);
    }
    function destroy(component, detaching) {
        if (component.$$) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal: not_equal$$1,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_render: [],
            after_render: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_render);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro && component.$$.fragment.i)
                component.$$.fragment.i();
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy(this, true);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (!stop) {
                    return; // not ready
                }
                subscribers.forEach((s) => s[1]());
                subscribers.forEach((s) => s[0](value));
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        const invalidators = [];
        const store = readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                run_all(invalidators);
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
        return {
            subscribe(run, invalidate = noop) {
                invalidators.push(invalidate);
                const unsubscribe = store.subscribe(run, invalidate);
                return () => {
                    const index = invalidators.indexOf(invalidate);
                    if (index !== -1) {
                        invalidators.splice(index, 1);
                    }
                    unsubscribe();
                };
            }
        };
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var urlPattern = createCommonjsModule(function (module, exports) {
    // Generated by CoffeeScript 1.10.0
    var slice = [].slice;

    (function(root, factory) {
      if (exports !== null) {
        return module.exports = factory();
      } else {
        return root.UrlPattern = factory();
      }
    })(commonjsGlobal, function() {
      var P, UrlPattern, astNodeContainsSegmentsForProvidedParams, astNodeToNames, astNodeToRegexString, baseAstNodeToRegexString, concatMap, defaultOptions, escapeForRegex, getParam, keysAndValuesToObject, newParser, regexGroupCount, stringConcatMap, stringify;
      escapeForRegex = function(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      };
      concatMap = function(array, f) {
        var i, length, results;
        results = [];
        i = -1;
        length = array.length;
        while (++i < length) {
          results = results.concat(f(array[i]));
        }
        return results;
      };
      stringConcatMap = function(array, f) {
        var i, length, result;
        result = '';
        i = -1;
        length = array.length;
        while (++i < length) {
          result += f(array[i]);
        }
        return result;
      };
      regexGroupCount = function(regex) {
        return (new RegExp(regex.toString() + '|')).exec('').length - 1;
      };
      keysAndValuesToObject = function(keys, values) {
        var i, key, length, object, value;
        object = {};
        i = -1;
        length = keys.length;
        while (++i < length) {
          key = keys[i];
          value = values[i];
          if (value == null) {
            continue;
          }
          if (object[key] != null) {
            if (!Array.isArray(object[key])) {
              object[key] = [object[key]];
            }
            object[key].push(value);
          } else {
            object[key] = value;
          }
        }
        return object;
      };
      P = {};
      P.Result = function(value, rest) {
        this.value = value;
        this.rest = rest;
      };
      P.Tagged = function(tag, value) {
        this.tag = tag;
        this.value = value;
      };
      P.tag = function(tag, parser) {
        return function(input) {
          var result, tagged;
          result = parser(input);
          if (result == null) {
            return;
          }
          tagged = new P.Tagged(tag, result.value);
          return new P.Result(tagged, result.rest);
        };
      };
      P.regex = function(regex) {
        return function(input) {
          var matches, result;
          matches = regex.exec(input);
          if (matches == null) {
            return;
          }
          result = matches[0];
          return new P.Result(result, input.slice(result.length));
        };
      };
      P.sequence = function() {
        var parsers;
        parsers = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return function(input) {
          var i, length, parser, rest, result, values;
          i = -1;
          length = parsers.length;
          values = [];
          rest = input;
          while (++i < length) {
            parser = parsers[i];
            result = parser(rest);
            if (result == null) {
              return;
            }
            values.push(result.value);
            rest = result.rest;
          }
          return new P.Result(values, rest);
        };
      };
      P.pick = function() {
        var indexes, parsers;
        indexes = arguments[0], parsers = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return function(input) {
          var array, result;
          result = P.sequence.apply(P, parsers)(input);
          if (result == null) {
            return;
          }
          array = result.value;
          result.value = array[indexes];
          return result;
        };
      };
      P.string = function(string) {
        var length;
        length = string.length;
        return function(input) {
          if (input.slice(0, length) === string) {
            return new P.Result(string, input.slice(length));
          }
        };
      };
      P.lazy = function(fn) {
        var cached;
        cached = null;
        return function(input) {
          if (cached == null) {
            cached = fn();
          }
          return cached(input);
        };
      };
      P.baseMany = function(parser, end, stringResult, atLeastOneResultRequired, input) {
        var endResult, parserResult, rest, results;
        rest = input;
        results = stringResult ? '' : [];
        while (true) {
          if (end != null) {
            endResult = end(rest);
            if (endResult != null) {
              break;
            }
          }
          parserResult = parser(rest);
          if (parserResult == null) {
            break;
          }
          if (stringResult) {
            results += parserResult.value;
          } else {
            results.push(parserResult.value);
          }
          rest = parserResult.rest;
        }
        if (atLeastOneResultRequired && results.length === 0) {
          return;
        }
        return new P.Result(results, rest);
      };
      P.many1 = function(parser) {
        return function(input) {
          return P.baseMany(parser, null, false, true, input);
        };
      };
      P.concatMany1Till = function(parser, end) {
        return function(input) {
          return P.baseMany(parser, end, true, true, input);
        };
      };
      P.firstChoice = function() {
        var parsers;
        parsers = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return function(input) {
          var i, length, parser, result;
          i = -1;
          length = parsers.length;
          while (++i < length) {
            parser = parsers[i];
            result = parser(input);
            if (result != null) {
              return result;
            }
          }
        };
      };
      newParser = function(options) {
        var U;
        U = {};
        U.wildcard = P.tag('wildcard', P.string(options.wildcardChar));
        U.optional = P.tag('optional', P.pick(1, P.string(options.optionalSegmentStartChar), P.lazy(function() {
          return U.pattern;
        }), P.string(options.optionalSegmentEndChar)));
        U.name = P.regex(new RegExp("^[" + options.segmentNameCharset + "]+"));
        U.named = P.tag('named', P.pick(1, P.string(options.segmentNameStartChar), P.lazy(function() {
          return U.name;
        })));
        U.escapedChar = P.pick(1, P.string(options.escapeChar), P.regex(/^./));
        U["static"] = P.tag('static', P.concatMany1Till(P.firstChoice(P.lazy(function() {
          return U.escapedChar;
        }), P.regex(/^./)), P.firstChoice(P.string(options.segmentNameStartChar), P.string(options.optionalSegmentStartChar), P.string(options.optionalSegmentEndChar), U.wildcard)));
        U.token = P.lazy(function() {
          return P.firstChoice(U.wildcard, U.optional, U.named, U["static"]);
        });
        U.pattern = P.many1(P.lazy(function() {
          return U.token;
        }));
        return U;
      };
      defaultOptions = {
        escapeChar: '\\',
        segmentNameStartChar: ':',
        segmentValueCharset: 'a-zA-Z0-9-_~ %',
        segmentNameCharset: 'a-zA-Z0-9',
        optionalSegmentStartChar: '(',
        optionalSegmentEndChar: ')',
        wildcardChar: '*'
      };
      baseAstNodeToRegexString = function(astNode, segmentValueCharset) {
        if (Array.isArray(astNode)) {
          return stringConcatMap(astNode, function(node) {
            return baseAstNodeToRegexString(node, segmentValueCharset);
          });
        }
        switch (astNode.tag) {
          case 'wildcard':
            return '(.*?)';
          case 'named':
            return "([" + segmentValueCharset + "]+)";
          case 'static':
            return escapeForRegex(astNode.value);
          case 'optional':
            return '(?:' + baseAstNodeToRegexString(astNode.value, segmentValueCharset) + ')?';
        }
      };
      astNodeToRegexString = function(astNode, segmentValueCharset) {
        if (segmentValueCharset == null) {
          segmentValueCharset = defaultOptions.segmentValueCharset;
        }
        return '^' + baseAstNodeToRegexString(astNode, segmentValueCharset) + '$';
      };
      astNodeToNames = function(astNode) {
        if (Array.isArray(astNode)) {
          return concatMap(astNode, astNodeToNames);
        }
        switch (astNode.tag) {
          case 'wildcard':
            return ['_'];
          case 'named':
            return [astNode.value];
          case 'static':
            return [];
          case 'optional':
            return astNodeToNames(astNode.value);
        }
      };
      getParam = function(params, key, nextIndexes, sideEffects) {
        var index, maxIndex, result, value;
        if (sideEffects == null) {
          sideEffects = false;
        }
        value = params[key];
        if (value == null) {
          if (sideEffects) {
            throw new Error("no values provided for key `" + key + "`");
          } else {
            return;
          }
        }
        index = nextIndexes[key] || 0;
        maxIndex = Array.isArray(value) ? value.length - 1 : 0;
        if (index > maxIndex) {
          if (sideEffects) {
            throw new Error("too few values provided for key `" + key + "`");
          } else {
            return;
          }
        }
        result = Array.isArray(value) ? value[index] : value;
        if (sideEffects) {
          nextIndexes[key] = index + 1;
        }
        return result;
      };
      astNodeContainsSegmentsForProvidedParams = function(astNode, params, nextIndexes) {
        var i, length;
        if (Array.isArray(astNode)) {
          i = -1;
          length = astNode.length;
          while (++i < length) {
            if (astNodeContainsSegmentsForProvidedParams(astNode[i], params, nextIndexes)) {
              return true;
            }
          }
          return false;
        }
        switch (astNode.tag) {
          case 'wildcard':
            return getParam(params, '_', nextIndexes, false) != null;
          case 'named':
            return getParam(params, astNode.value, nextIndexes, false) != null;
          case 'static':
            return false;
          case 'optional':
            return astNodeContainsSegmentsForProvidedParams(astNode.value, params, nextIndexes);
        }
      };
      stringify = function(astNode, params, nextIndexes) {
        if (Array.isArray(astNode)) {
          return stringConcatMap(astNode, function(node) {
            return stringify(node, params, nextIndexes);
          });
        }
        switch (astNode.tag) {
          case 'wildcard':
            return getParam(params, '_', nextIndexes, true);
          case 'named':
            return getParam(params, astNode.value, nextIndexes, true);
          case 'static':
            return astNode.value;
          case 'optional':
            if (astNodeContainsSegmentsForProvidedParams(astNode.value, params, nextIndexes)) {
              return stringify(astNode.value, params, nextIndexes);
            } else {
              return '';
            }
        }
      };
      UrlPattern = function(arg1, arg2) {
        var groupCount, options, parsed, parser, withoutWhitespace;
        if (arg1 instanceof UrlPattern) {
          this.isRegex = arg1.isRegex;
          this.regex = arg1.regex;
          this.ast = arg1.ast;
          this.names = arg1.names;
          return;
        }
        this.isRegex = arg1 instanceof RegExp;
        if (!(('string' === typeof arg1) || this.isRegex)) {
          throw new TypeError('argument must be a regex or a string');
        }
        if (this.isRegex) {
          this.regex = arg1;
          if (arg2 != null) {
            if (!Array.isArray(arg2)) {
              throw new Error('if first argument is a regex the second argument may be an array of group names but you provided something else');
            }
            groupCount = regexGroupCount(this.regex);
            if (arg2.length !== groupCount) {
              throw new Error("regex contains " + groupCount + " groups but array of group names contains " + arg2.length);
            }
            this.names = arg2;
          }
          return;
        }
        if (arg1 === '') {
          throw new Error('argument must not be the empty string');
        }
        withoutWhitespace = arg1.replace(/\s+/g, '');
        if (withoutWhitespace !== arg1) {
          throw new Error('argument must not contain whitespace');
        }
        options = {
          escapeChar: (arg2 != null ? arg2.escapeChar : void 0) || defaultOptions.escapeChar,
          segmentNameStartChar: (arg2 != null ? arg2.segmentNameStartChar : void 0) || defaultOptions.segmentNameStartChar,
          segmentNameCharset: (arg2 != null ? arg2.segmentNameCharset : void 0) || defaultOptions.segmentNameCharset,
          segmentValueCharset: (arg2 != null ? arg2.segmentValueCharset : void 0) || defaultOptions.segmentValueCharset,
          optionalSegmentStartChar: (arg2 != null ? arg2.optionalSegmentStartChar : void 0) || defaultOptions.optionalSegmentStartChar,
          optionalSegmentEndChar: (arg2 != null ? arg2.optionalSegmentEndChar : void 0) || defaultOptions.optionalSegmentEndChar,
          wildcardChar: (arg2 != null ? arg2.wildcardChar : void 0) || defaultOptions.wildcardChar
        };
        parser = newParser(options);
        parsed = parser.pattern(arg1);
        if (parsed == null) {
          throw new Error("couldn't parse pattern");
        }
        if (parsed.rest !== '') {
          throw new Error("could only partially parse pattern");
        }
        this.ast = parsed.value;
        this.regex = new RegExp(astNodeToRegexString(this.ast, options.segmentValueCharset));
        this.names = astNodeToNames(this.ast);
      };
      UrlPattern.prototype.match = function(url) {
        var groups, match;
        match = this.regex.exec(url);
        if (match == null) {
          return null;
        }
        groups = match.slice(1);
        if (this.names) {
          return keysAndValuesToObject(this.names, groups);
        } else {
          return groups;
        }
      };
      UrlPattern.prototype.stringify = function(params) {
        if (params == null) {
          params = {};
        }
        if (this.isRegex) {
          throw new Error("can't stringify patterns generated from a regex");
        }
        if (params !== Object(params)) {
          throw new Error("argument must be an object or undefined");
        }
        return stringify(this.ast, params, {});
      };
      UrlPattern.escapeForRegex = escapeForRegex;
      UrlPattern.concatMap = concatMap;
      UrlPattern.stringConcatMap = stringConcatMap;
      UrlPattern.regexGroupCount = regexGroupCount;
      UrlPattern.keysAndValuesToObject = keysAndValuesToObject;
      UrlPattern.P = P;
      UrlPattern.newParser = newParser;
      UrlPattern.defaultOptions = defaultOptions;
      UrlPattern.astNodeToRegexString = astNodeToRegexString;
      UrlPattern.astNodeToNames = astNodeToNames;
      UrlPattern.getParam = getParam;
      UrlPattern.astNodeContainsSegmentsForProvidedParams = astNodeContainsSegmentsForProvidedParams;
      UrlPattern.stringify = stringify;
      return UrlPattern;
    });
    });

    function defineProp (obj, prop, value) {
      Object.defineProperty(obj, prop, { value });
    }

    // Parse schema into routes
    function parse (schema = {}, notRoot, pathname, href = '#') {
      // Convert schema to options object. Schema can be:
      // + function: Svelte component
      // + string: redirect path
      // + object: options
      if (notRoot) {
        let type = typeof schema;
        schema = type === 'function' ? { $$component: schema }
          : type === 'string' ? { $$redirect: schema }
          : type !== 'object' ? {}
          : schema === null ? {} : schema;

        let c = schema.$$component;
        if (typeof c !== 'function' && c !== undefined && c !== null)
          throw new Error('Invalid Svelte component')
      }

      // Any properties not starting with $$ will be treated as routes,
      // the rest will be kept as route data. Custom data is also kept,
      // but will be replaced with internal data if duplicating names.
      let route = {};
      for (let i in schema) {
        if (/^\$\$/.test(i))
          defineProp(route, i, schema[i]);
        else
          route[i] = parse(schema[i], true, i, href + i);
      }

      // Define internal data
      if (notRoot) {
        defineProp(route, '$$href', href); // full path including #
        defineProp(route, '$$pathname', pathname); // scoped path
        defineProp(route, '$$pattern', new urlPattern(href));
        defineProp(route, '$$stringify', v => route.$$pattern.stringify(v));
      }

      return route
    }

    // Routes store must be set before creating any Svelte components.
    // It can only be set once. A parsed version is created after with
    // helpful internal data
    let schema = writable();
    let routes = derived(schema, $ => parse($));
    routes.set = v => {
      schema.set(v);
      delete routes.set;
    };

    let regex = /(#?[^?]*)?(\?.*)?/;

    function parse$1 () {
      let match = regex.exec(window.location.hash);
      let pathname = match[1] || '#/';
      let querystring = match[2];
      return { pathname, querystring }
    }

    let path = readable(parse$1(), set => {
      let update = () => set(parse$1());
      window.addEventListener('hashchange', update);
      return () => window.removeEventListener('hashchange', update)
    });

    let pathname = derived(path, $ => $.pathname); // current pathname without query
    let querystring = derived(path, $ => $.querystring);
    let query = derived(querystring, $ => Object.fromEntries(new URLSearchParams($)));

    function map (routes, matches = []) {
      return Object.values(routes).reverse().map(e => [e, matches])
    }

    // Search for matching route
    function parse$2 (routes, pathname) {
      let stack = map(routes);

      while (stack.length) {
        let [active, matches] = stack.pop();
        let params = active.$$pattern.match(pathname);
        matches = [...matches, active];

        if (params) {
          return !active.$$redirect
            ? { active, params, matches }
            // redirect
            : tick().then(() => {
              history.replaceState(null, null, '#' + active.$$redirect);
              window.dispatchEvent(new Event('hashchange'));
            })
        }

        stack = stack.concat(map(active, matches));
      }
    }

    let match = derived([routes, pathname], ([$r, $p]) => parse$2($r, $p) || {});
    let active$1 = derived(match, $ => $.active || {}); // current active route
    let params = derived(match, $ => $.params || {});
    let matches = derived(match, $ => $.matches || []); // parents of active route and itself
    let components = derived(matches, $ => $.map(e => e.$$component).filter(e => e));// components to use in <Router/>

    /* src\components\Router.svelte generated by Svelte v3.5.1 */

    function create_fragment(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		ctx.$$props
    	];

    	var switch_value = ctx.$components[ctx.i];

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i_1 = 0; i_1 < switch_instance_spread_levels.length; i_1 += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i_1]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = changed.$$props ? get_spread_update(switch_instance_spread_levels, [
    				ctx.$$props
    			]) : {};

    			if (switch_value !== (switch_value = ctx.$components[ctx.i])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					on_outro(() => {
    						old_component.$destroy();
    					});
    					old_component.$$.fragment.o(1);
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					switch_instance.$$.fragment.i(1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) switch_instance.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) switch_instance.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(switch_instance_anchor);
    			}

    			if (switch_instance) switch_instance.$destroy(detaching);
    		}
    	};
    }

    let level = 0;

    function instance($$self, $$props, $$invalidate) {
    	let $components;

    	validate_store(components, 'components');
    	subscribe($$self, components, $$value => { $components = $$value; $$invalidate('$components', $components); });

    	

    let i = level++;
    onDestroy(() => level--);

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		i,
    		$components,
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* test\src\components\NavItem.svelte generated by Svelte v3.5.1 */

    const file = "test\\src\\components\\NavItem.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.r = list[i];
    	return child_ctx;
    }

    // (19:2) {#if !root || deep && $matches.includes(r)}
    function create_if_block_1(ctx) {
    	var t, if_block_anchor, current;

    	var navitem = new NavItem({
    		props: {
    		route: ctx.r,
    		root: false,
    		deep: ctx.deep,
    		pad: ctx.pad
    	},
    		$$inline: true
    	});

    	var if_block = (ctx.root) && create_if_block_2();

    	return {
    		c: function create() {
    			navitem.$$.fragment.c();
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			mount_component(navitem, target, anchor);
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navitem_changes = {};
    			if (changed.routes) navitem_changes.route = ctx.r;
    			if (changed.deep) navitem_changes.deep = ctx.deep;
    			if (changed.pad) navitem_changes.pad = ctx.pad;
    			navitem.$set(navitem_changes);

    			if (ctx.root) {
    				if (!if_block) {
    					if_block = create_if_block_2();
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			navitem.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			navitem.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			navitem.$destroy(detaching);

    			if (detaching) {
    				detach(t);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (21:4) {#if root}
    function create_if_block_2(ctx) {
    	var div;

    	return {
    		c: function create() {
    			div = element("div");
    			div.className = "divider svelte-1sbncbh";
    			add_location(div, file, 21, 6, 541);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (12:0) {#each routes as r}
    function create_each_block(ctx) {
    	var a, t0_value = ctx.r.$$name || ctx.r.$$pathname, t0, a_href_value, t1, if_block_anchor, current;

    	var if_block = (!ctx.root || ctx.deep && ctx.$matches.includes(ctx.r)) && create_if_block_1(ctx);

    	return {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			a.href = a_href_value = ctx.r.$$href;
    			a.style.cssText = ctx.style;
    			a.className = "svelte-1sbncbh";
    			toggle_class(a, "active", ctx.r === ctx.$active);
    			add_location(a, file, 12, 2, 301);
    		},

    		m: function mount(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t0);
    			insert(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.routes) && t0_value !== (t0_value = ctx.r.$$name || ctx.r.$$pathname)) {
    				set_data(t0, t0_value);
    			}

    			if ((!current || changed.routes) && a_href_value !== (a_href_value = ctx.r.$$href)) {
    				a.href = a_href_value;
    			}

    			if (!current || changed.style) {
    				a.style.cssText = ctx.style;
    			}

    			if ((changed.routes || changed.$active)) {
    				toggle_class(a, "active", ctx.r === ctx.$active);
    			}

    			if (!ctx.root || ctx.deep && ctx.$matches.includes(ctx.r)) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					if_block.i(1);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.i(1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				on_outro(() => {
    					if_block.d(1);
    					if_block = null;
    				});

    				if_block.o(1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(a);
    				detach(t1);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (26:0) {#if !deep}
    function create_if_block(ctx) {
    	var div;

    	return {
    		c: function create() {
    			div = element("div");
    			div.className = "divider svelte-1sbncbh";
    			add_location(div, file, 26, 2, 614);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var t, if_block_anchor, current;

    	var each_value = ctx.routes;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	var if_block = (!ctx.deep) && create_if_block();

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.root || changed.deep || changed.$matches || changed.routes || changed.pad || changed.style || changed.$active) {
    				each_value = ctx.routes;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}

    			if (!ctx.deep) {
    				if (!if_block) {
    					if_block = create_if_block();
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $active, $matches;

    	validate_store(active$1, 'active');
    	subscribe($$self, active$1, $$value => { $active = $$value; $$invalidate('$active', $active); });
    	validate_store(matches, 'matches');
    	subscribe($$self, matches, $$value => { $matches = $$value; $$invalidate('$matches', $matches); });

    	let { route = {}, root = true, deep = false, pad = 0 } = $$props;

    	const writable_props = ['route', 'root', 'deep', 'pad'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<NavItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('route' in $$props) $$invalidate('route', route = $$props.route);
    		if ('root' in $$props) $$invalidate('root', root = $$props.root);
    		if ('deep' in $$props) $$invalidate('deep', deep = $$props.deep);
    		if ('pad' in $$props) $$invalidate('pad', pad = $$props.pad);
    	};

    	let routes, style;

    	$$self.$$.update = ($$dirty = { route: 1, pad: 1 }) => {
    		if ($$dirty.route) { $$invalidate('routes', routes = typeof route === 'object' ? Object.values(route) : route); }
    		if ($$dirty.pad) { $$invalidate('style', style = `padding-left:${++pad * 20}px`); $$invalidate('pad', pad); }
    	};

    	return {
    		route,
    		root,
    		deep,
    		pad,
    		routes,
    		style,
    		$active,
    		$matches
    	};
    }

    class NavItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["route", "root", "deep", "pad"]);
    	}

    	get route() {
    		throw new Error("<NavItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set route(value) {
    		throw new Error("<NavItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get root() {
    		throw new Error("<NavItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set root(value) {
    		throw new Error("<NavItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get deep() {
    		throw new Error("<NavItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set deep(value) {
    		throw new Error("<NavItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pad() {
    		throw new Error("<NavItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pad(value) {
    		throw new Error("<NavItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* test\src\App.svelte generated by Svelte v3.5.1 */

    const file$1 = "test\\src\\App.svelte";

    function create_fragment$2(ctx) {
    	var div0, t0, t1, div1, current;

    	var navitem0 = new NavItem({
    		props: { route: [ctx.$routes[`/`]] },
    		$$inline: true
    	});

    	var navitem1 = new NavItem({
    		props: { route: ctx.$routes[`/`], deep: true },
    		$$inline: true
    	});

    	var router = new Router({ $$inline: true });

    	return {
    		c: function create() {
    			div0 = element("div");
    			navitem0.$$.fragment.c();
    			t0 = space();
    			navitem1.$$.fragment.c();
    			t1 = space();
    			div1 = element("div");
    			router.$$.fragment.c();
    			div0.className = "nav svelte-1224ofi";
    			add_location(div0, file$1, 5, 0, 118);
    			div1.className = "view svelte-1224ofi";
    			add_location(div1, file$1, 9, 0, 233);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div0, anchor);
    			mount_component(navitem0, div0, null);
    			append(div0, t0);
    			mount_component(navitem1, div0, null);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			mount_component(router, div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navitem0_changes = {};
    			if (changed.$routes) navitem0_changes.route = [ctx.$routes[`/`]];
    			navitem0.$set(navitem0_changes);

    			var navitem1_changes = {};
    			if (changed.$routes) navitem1_changes.route = ctx.$routes[`/`];
    			navitem1.$set(navitem1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			navitem0.$$.fragment.i(local);

    			navitem1.$$.fragment.i(local);

    			router.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			navitem0.$$.fragment.o(local);
    			navitem1.$$.fragment.o(local);
    			router.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div0);
    			}

    			navitem0.$destroy();

    			navitem1.$destroy();

    			if (detaching) {
    				detach(t1);
    				detach(div1);
    			}

    			router.$destroy();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $routes;

    	validate_store(routes, 'routes');
    	subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });

    	return { $routes };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
        };
    }

    /* test\src\components\Route.svelte generated by Svelte v3.5.1 */

    const file$2 = "test\\src\\components\\Route.svelte";

    // (10:2) {#if deep}
    function create_if_block$1(ctx) {
    	var current;

    	var router = new Router({
    		props: { deep: ctx.deep, outline: ctx.outline },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			router.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.deep) router_changes.deep = ctx.deep;
    			if (changed.outline) router_changes.outline = ctx.outline;
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			router.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			router.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			router.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var div1, div0, t0, t1, div1_intro, current;

    	var if_block = (ctx.deep) && create_if_block$1(ctx);

    	return {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(ctx.name);
    			t1 = space();
    			if (if_block) if_block.c();
    			add_location(div0, file$2, 8, 2, 217);
    			div1.className = "route svelte-jokiez";
    			toggle_class(div1, "outline", ctx.outline);
    			add_location(div1, file$2, 7, 0, 172);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, t0);
    			append(div1, t1);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.name) {
    				set_data(t0, ctx.name);
    			}

    			if (ctx.deep) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					if_block.i(1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.i(1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();
    				on_outro(() => {
    					if_block.d(1);
    					if_block = null;
    				});

    				if_block.o(1);
    				check_outros();
    			}

    			if (changed.outline) {
    				toggle_class(div1, "outline", ctx.outline);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();

    			if (!div1_intro) {
    				add_render_callback(() => {
    					div1_intro = create_in_transition(div1, fade, {});
    					div1_intro.start();
    				});
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	
    let { name, deep = false, outline = false } = $$props;

    	const writable_props = ['name', 'deep', 'outline'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Route> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('deep' in $$props) $$invalidate('deep', deep = $$props.deep);
    		if ('outline' in $$props) $$invalidate('outline', outline = $$props.outline);
    	};

    	return { name, deep, outline };
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["name", "deep", "outline"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<Route> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get deep() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set deep(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get outline() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set outline(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* test\src\components\Route1.svelte generated by Svelte v3.5.1 */

    function create_fragment$4(ctx) {
    	var current;

    	var route_spread_levels = [
    		{ name: "Route 1" },
    		ctx.$$props
    	];

    	let route_props = {};
    	for (var i = 0; i < route_spread_levels.length; i += 1) {
    		route_props = assign(route_props, route_spread_levels[i]);
    	}
    	var route = new Route({ props: route_props, $$inline: true });

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route_changes = changed.$$props ? get_spread_update(route_spread_levels, [
    				{ name: "Route 1" },
    				ctx.$$props
    			]) : {};
    			route.$set(route_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class Route1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    /* test\src\components\Route2.svelte generated by Svelte v3.5.1 */

    function create_fragment$5(ctx) {
    	var current;

    	var route_spread_levels = [
    		{ name: "Route 2" },
    		ctx.$$props
    	];

    	let route_props = {};
    	for (var i = 0; i < route_spread_levels.length; i += 1) {
    		route_props = assign(route_props, route_spread_levels[i]);
    	}
    	var route = new Route({ props: route_props, $$inline: true });

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route_changes = changed.$$props ? get_spread_update(route_spread_levels, [
    				{ name: "Route 2" },
    				ctx.$$props
    			]) : {};
    			route.$set(route_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class Route2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
    	}
    }

    /* test\src\components\Route3.svelte generated by Svelte v3.5.1 */

    function create_fragment$6(ctx) {
    	var current;

    	var route_spread_levels = [
    		{ name: "Route 3" },
    		ctx.$$props
    	];

    	let route_props = {};
    	for (var i = 0; i < route_spread_levels.length; i += 1) {
    		route_props = assign(route_props, route_spread_levels[i]);
    	}
    	var route = new Route({ props: route_props, $$inline: true });

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route_changes = changed.$$props ? get_spread_update(route_spread_levels, [
    				{ name: "Route 3" },
    				ctx.$$props
    			]) : {};
    			route.$set(route_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class Route3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, []);
    	}
    }

    /* test\src\views\Basic.svelte generated by Svelte v3.5.1 */

    function create_fragment$7(ctx) {
    	var current;

    	var route = new Route({
    		props: { name: "Basic", deep: true },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }



    let basicRoutes = {
    '/route1': Route1,
    '/route2': Route2,
    '/route3': Route3
    };

    class Basic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$7, safe_not_equal, []);
    	}
    }

    /* test\src\components\Route4.svelte generated by Svelte v3.5.1 */

    function create_fragment$8(ctx) {
    	var current;

    	var route_spread_levels = [
    		{ name: "Route 4" },
    		ctx.$$props
    	];

    	let route_props = {};
    	for (var i = 0; i < route_spread_levels.length; i += 1) {
    		route_props = assign(route_props, route_spread_levels[i]);
    	}
    	var route = new Route({ props: route_props, $$inline: true });

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route_changes = changed.$$props ? get_spread_update(route_spread_levels, [
    				{ name: "Route 4" },
    				ctx.$$props
    			]) : {};
    			route.$set(route_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class Route4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, []);
    	}
    }

    /* test\src\components\Route5.svelte generated by Svelte v3.5.1 */

    function create_fragment$9(ctx) {
    	var current;

    	var route_spread_levels = [
    		{ name: "Route 5" },
    		ctx.$$props
    	];

    	let route_props = {};
    	for (var i = 0; i < route_spread_levels.length; i += 1) {
    		route_props = assign(route_props, route_spread_levels[i]);
    	}
    	var route = new Route({ props: route_props, $$inline: true });

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route_changes = changed.$$props ? get_spread_update(route_spread_levels, [
    				{ name: "Route 5" },
    				ctx.$$props
    			]) : {};
    			route.$set(route_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class Route5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, []);
    	}
    }

    /* test\src\views\Nested.svelte generated by Svelte v3.5.1 */

    function create_fragment$a(ctx) {
    	var current;

    	var route = new Route({
    		props: {
    		name: "Nested",
    		deep: true,
    		outline: true
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }



    let nestedRoutes = {
    '/route1': {
      $$component: Route1,
      '/route3': Route3,
      '/route4': Route4
    },
    '/route2': {
      $$component: Route2,
      '/route5': Route5
    }
    };

    class Nested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$a, safe_not_equal, []);
    	}
    }

    /* test\src\components\RouteAny.svelte generated by Svelte v3.5.1 */

    function create_fragment$b(ctx) {
    	var current;

    	var route_spread_levels = [
    		{ name: "Route Any" },
    		ctx.$$props
    	];

    	let route_props = {};
    	for (var i = 0; i < route_spread_levels.length; i += 1) {
    		route_props = assign(route_props, route_spread_levels[i]);
    	}
    	var route = new Route({ props: route_props, $$inline: true });

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route_changes = changed.$$props ? get_spread_update(route_spread_levels, [
    				{ name: "Route Any" },
    				ctx.$$props
    			]) : {};
    			route.$set(route_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class RouteAny extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$b, safe_not_equal, []);
    	}
    }

    /* test\src\components\CatchAll.svelte generated by Svelte v3.5.1 */

    function create_fragment$c(ctx) {
    	var current;

    	var route_spread_levels = [
    		{ name: "Catch All" },
    		ctx.$$props
    	];

    	let route_props = {};
    	for (var i = 0; i < route_spread_levels.length; i += 1) {
    		route_props = assign(route_props, route_spread_levels[i]);
    	}
    	var route = new Route({ props: route_props, $$inline: true });

    	return {
    		c: function create() {
    			route.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route_changes = changed.$$props ? get_spread_update(route_spread_levels, [
    				{ name: "Catch All" },
    				ctx.$$props
    			]) : {};
    			route.$set(route_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			route.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			route.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			route.$destroy(detaching);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    	};

    	return {
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class CatchAll extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$c, safe_not_equal, []);
    	}
    }

    /* test\src\components\Link.svelte generated by Svelte v3.5.1 */

    const file$3 = "test\\src\\components\\Link.svelte";

    function create_fragment$d(ctx) {
    	var a, t0, t1;

    	return {
    		c: function create() {
    			a = element("a");
    			t0 = text("Goto: ");
    			t1 = text(ctx.label);
    			a.href = ctx.href;
    			a.className = "svelte-1p86q1f";
    			add_location(a, file$3, 5, 0, 68);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t0);
    			append(a, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.label) {
    				set_data(t1, ctx.label);
    			}

    			if (changed.href) {
    				a.href = ctx.href;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(a);
    			}
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { href = '', label = '' } = $$props;

    	const writable_props = ['href', 'label'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('label' in $$props) $$invalidate('label', label = $$props.label);
    	};

    	return { href, label };
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$d, safe_not_equal, ["href", "label"]);
    	}

    	get href() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* test\src\views\Wildcard.svelte generated by Svelte v3.5.1 */

    const file$4 = "test\\src\\views\\Wildcard.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.e = list[i];
    	return child_ctx;
    }

    // (25:2) {#each to as e}
    function create_each_block$1(ctx) {
    	var current;

    	var link = new Link({
    		props: { href: `#/wildcard` + ctx.e, label: ctx.e },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.to) link_changes.href = `#/wildcard` + ctx.e;
    			if (changed.to) link_changes.label = ctx.e;
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			link.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			link.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			link.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	var div, t, current;

    	var each_value = ctx.to;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	var router = new Router({ $$inline: true });

    	return {
    		c: function create() {
    			div = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			router.$$.fragment.c();
    			add_location(div, file$4, 23, 0, 472);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(div, t);
    			mount_component(router, div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.to) {
    				each_value = ctx.to;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div, t);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			router.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			router.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_each(each_blocks, detaching);

    			router.$destroy();
    		}
    	};
    }



    let wildcardRoutes = {
    '/route1': Route1,
    '/route*': RouteAny,
    '*': CatchAll
    };

    function instance$c($$self) {
    	

    let to = [
      '/route1',
      '/route-unknown',
      '/whatever'
    ];

    	return { to };
    }

    class Wildcard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$e, safe_not_equal, []);
    	}
    }

    /* test\src\views\Params.svelte generated by Svelte v3.5.1 */

    const file$5 = "test\\src\\views\\Params.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.e = list[i];
    	return child_ctx;
    }

    // (23:2) {#each to as e}
    function create_each_block$2(ctx) {
    	var current;

    	var link = new Link({
    		props: { href: `#/params` + ctx.e, label: ctx.e },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.to) link_changes.href = `#/params` + ctx.e;
    			if (changed.to) link_changes.label = ctx.e;
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			link.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			link.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			link.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	var div, t0, pre, t1_value = JSON.stringify(ctx.$params, null, 2), t1, current;

    	var each_value = ctx.to;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			div = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			pre = element("pre");
    			t1 = text(t1_value);
    			add_location(div, file$5, 21, 0, 330);
    			pre.className = "svelte-vmfcpt";
    			add_location(pre, file$5, 26, 0, 422);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert(target, t0, anchor);
    			insert(target, pre, anchor);
    			append(pre, t1);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.to) {
    				each_value = ctx.to;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}

    			if ((!current || changed.$params) && t1_value !== (t1_value = JSON.stringify(ctx.$params, null, 2))) {
    				set_data(t1, t1_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t0);
    				detach(pre);
    			}
    		}
    	};
    }

    let paramsRoutes = {
    '/id/John': '',
    '/:id/John': '',
    '/:id/:name': '',
    '*': ''
    };

    function instance$d($$self, $$props, $$invalidate) {
    	let $params;

    	validate_store(params, 'params');
    	subscribe($$self, params, $$value => { $params = $$value; $$invalidate('$params', $params); });

    	

    let to = [
      '/id/John',
      '/123/John',
      '/123/Ryan',
      '/whatever'
    ];

    	return { to, $params };
    }

    class Params extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$f, safe_not_equal, []);
    	}
    }

    /* test\src\views\Query.svelte generated by Svelte v3.5.1 */

    const file$6 = "test\\src\\views\\Query.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.e = list[i];
    	return child_ctx;
    }

    // (12:2) {#each to as e}
    function create_each_block$3(ctx) {
    	var current;

    	var link = new Link({
    		props: { href: `#/query` + ctx.e, label: ctx.e },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.to) link_changes.href = `#/query` + ctx.e;
    			if (changed.to) link_changes.label = ctx.e;
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			link.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			link.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			link.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$g(ctx) {
    	var div, t0, pre, t1_value = JSON.stringify(ctx.$query, null, 2), t1, current;

    	var each_value = ctx.to;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			div = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			pre = element("pre");
    			t1 = text(t1_value);
    			add_location(div, file$6, 10, 0, 149);
    			pre.className = "svelte-vmfcpt";
    			add_location(pre, file$6, 15, 0, 240);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert(target, t0, anchor);
    			insert(target, pre, anchor);
    			append(pre, t1);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.to) {
    				each_value = ctx.to;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}

    			if ((!current || changed.$query) && t1_value !== (t1_value = JSON.stringify(ctx.$query, null, 2))) {
    				set_data(t1, t1_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t0);
    				detach(pre);
    			}
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let $query;

    	validate_store(query, 'query');
    	subscribe($$self, query, $$value => { $query = $$value; $$invalidate('$query', $query); });

    	

    let to = [
      '?a&b',
      '?a=1&b=c'
    ];

    	return { to, $query };
    }

    class Query extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$g, safe_not_equal, []);
    	}
    }

    /* test\src\views\Redirect.svelte generated by Svelte v3.5.1 */

    const file$7 = "test\\src\\views\\Redirect.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.e = list[i];
    	return child_ctx;
    }

    // (12:2) {#each to as e}
    function create_each_block$4(ctx) {
    	var current;

    	var link = new Link({
    		props: { href: `#` + ctx.e, label: ctx.e },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.to) link_changes.href = `#` + ctx.e;
    			if (changed.to) link_changes.label = ctx.e;
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			link.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			link.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			link.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$h(ctx) {
    	var div0, t_1, div1, current;

    	var each_value = ctx.to;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "All routes not matched will be redirected here";
    			t_1 = space();
    			div1 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			div0.className = "svelte-nvcz3e";
    			add_location(div0, file$7, 9, 0, 116);
    			div1.className = "svelte-nvcz3e";
    			add_location(div1, file$7, 10, 0, 175);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t_1, anchor);
    			insert(target, div1, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.to) {
    				each_value = ctx.to;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div0);
    				detach(t_1);
    				detach(div1);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$f($$self) {
    	let to = [
      '/a-link',
      'what-e-ver'
    ];

    	return { to };
    }

    class Redirect extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$h, safe_not_equal, []);
    	}
    }

    routes.set({
      '/': {
        $$component: App,
        'basic': { $$component: Basic, ...basicRoutes },
        'nested': { $$component: Nested, ...nestedRoutes },
        'wildcard': { $$component: Wildcard, ...wildcardRoutes },
        'params': { $$component: Params, ...paramsRoutes },
        'query': Query,
        'redirect': Redirect
      },
      '*': '/redirect'
    });

    let app = new Router({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
