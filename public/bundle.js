
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
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
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.17.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    const queryString = `
query IntrospectionQuery {
    __schema {
      queryType {
        ...FullType
      }
      mutationType {
        ...FullType
      }
      subscriptionType {
        name
      }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }
  
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }
  
  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }
  
  fragment TypeRef on __Type {
    kind
    name
    description
    ofType {
      kind
      name
      description
      ofType {
        kind
        name
        description
        ofType {
          kind
          name
          description
          ofType {
            kind
            name
            description
            ofType {
              kind
              name
              description
              ofType {
                kind
                name
                description
                ofType {
                  kind
                  name
                  description
                }
              }
            }
          }
        }
      }
    }
  }
  

`;

    /* src/JsonView.svelte generated by Svelte v3.17.1 */

    const file = "src/JsonView.svelte";

    function create_fragment(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "self svelte-1rj0q3e");
    			add_location(div, file, 23, 0, 262);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[2](div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[2](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { json } = $$props;
    	let elem;
    	const writable_props = ["json"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JsonView> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, elem = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("json" in $$props) $$invalidate(1, json = $$props.json);
    	};

    	$$self.$capture_state = () => {
    		return { json, elem };
    	};

    	$$self.$inject_state = $$props => {
    		if ("json" in $$props) $$invalidate(1, json = $$props.json);
    		if ("elem" in $$props) $$invalidate(0, elem = $$props.elem);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*elem, json*/ 3) {
    			 try {
    				window.$(elem).jsonViewer(json, { collapsed: true, rootCollapsable: false });
    			} catch(error) {
    				
    			}
    		}
    	};

    	return [elem, json, div_binding];
    }

    class JsonView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { json: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JsonView",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*json*/ ctx[1] === undefined && !("json" in props)) {
    			console.warn("<JsonView> was created without expected prop 'json'");
    		}
    	}

    	get json() {
    		throw new Error("<JsonView>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set json(value) {
    		throw new Error("<JsonView>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
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
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
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
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const changeCount = writable(0);

    /* src/schemer/schemer.svelte generated by Svelte v3.17.1 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$1 = "src/schemer/schemer.svelte";

    // (142:2) {#if Object.entries(scheme).length != 0 }
    function create_if_block_1(ctx) {
    	let a;
    	let t0_value = (/*visible*/ ctx[7] ? "Hide" : "Show") + "";
    	let t0;
    	let t1;
    	let br0;
    	let br1;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = text(" scheme");
    			br0 = element("br");
    			br1 = element("br");
    			attr_dev(a, "href", "");
    			add_location(a, file$1, 142, 8, 3619);
    			add_location(br0, file$1, 142, 106, 3717);
    			add_location(br1, file$1, 142, 110, 3721);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			dispose = listen_dev(a, "click", prevent_default(/*click_handler*/ ctx[17]), false, true, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*visible*/ 128 && t0_value !== (t0_value = (/*visible*/ ctx[7] ? "Hide" : "Show") + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(142:2) {#if Object.entries(scheme).length != 0 }",
    		ctx
    	});

    	return block;
    }

    // (146:2) {#if visible}
    function create_if_block(ctx) {
    	let current;

    	const jsonview = new JsonView({
    			props: { json: /*scheme*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonview.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonview, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonview_changes = {};
    			if (dirty & /*scheme*/ 1) jsonview_changes.json = /*scheme*/ ctx[0];
    			jsonview.$set(jsonview_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonview, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(146:2) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let form;
    	let div2;
    	let input0;
    	let t0;
    	let div0;
    	let input1;
    	let t1;
    	let label;
    	let t3;
    	let div1;
    	let t4;
    	let input2;
    	let t5;
    	let show_if = Object.entries(/*scheme*/ ctx[0]).length != 0;
    	let t6;
    	let current;
    	let dispose;
    	let if_block0 = show_if && create_if_block_1(ctx);
    	let if_block1 = /*visible*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			form = element("form");
    			div2 = element("div");
    			input0 = element("input");
    			t0 = space();
    			div0 = element("div");
    			input1 = element("input");
    			t1 = space();
    			label = element("label");
    			label.textContent = "Include credentials";
    			t3 = space();
    			div1 = element("div");
    			t4 = space();
    			input2 = element("input");
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(input0, "class", "text svelte-1prjgt0");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "for example: https://my.site/schema");
    			input0.value = /*url*/ ctx[3];
    			add_location(input0, file$1, 131, 12, 2941);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "id", "sss5678");
    			attr_dev(input1, "title", "include credentials to requests");
    			add_location(input1, file$1, 133, 16, 3122);
    			attr_dev(label, "for", "sss5678");
    			attr_dev(label, "class", "smaller svelte-1prjgt0");
    			add_location(label, file$1, 134, 16, 3275);
    			add_location(div0, file$1, 132, 12, 3100);
    			attr_dev(div1, "class", "errors svelte-1prjgt0");
    			add_location(div1, file$1, 136, 12, 3371);
    			add_location(div2, file$1, 130, 8, 2923);
    			attr_dev(input2, "type", "submit");
    			attr_dev(input2, "id", "subm444");
    			attr_dev(input2, "class", "button svelte-1prjgt0");
    			input2.value = "↻ reload schema";
    			add_location(input2, file$1, 138, 8, 3447);
    			attr_dev(form, "class", "row svelte-1prjgt0");
    			add_location(form, file$1, 129, 2, 2859);
    			add_location(div3, file$1, 127, 0, 2850);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, form);
    			append_dev(form, div2);
    			append_dev(div2, input0);
    			/*input0_binding*/ ctx[13](input0);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, input1);
    			/*input1_binding*/ ctx[14](input1);
    			append_dev(div0, t1);
    			append_dev(div0, label);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			/*div1_binding*/ ctx[15](div1);
    			append_dev(form, t4);
    			append_dev(form, input2);
    			/*input2_binding*/ ctx[16](input2);
    			append_dev(div3, t5);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t6);
    			if (if_block1) if_block1.m(div3, null);
    			current = true;

    			dispose = [
    				listen_dev(input0, "input", /*incChangeCounter*/ ctx[8], false, false, false),
    				listen_dev(input1, "change", /*incChangeCounter*/ ctx[8], false, false, false),
    				listen_dev(form, "submit", prevent_default(/*getSchema*/ ctx[4]), false, true, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*url*/ 8 && input0.value !== /*url*/ ctx[3]) {
    				prop_dev(input0, "value", /*url*/ ctx[3]);
    			}

    			if (dirty & /*scheme*/ 1) show_if = Object.entries(/*scheme*/ ctx[0]).length != 0;

    			if (show_if) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div3, t6);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*visible*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*input0_binding*/ ctx[13](null);
    			/*input1_binding*/ ctx[14](null);
    			/*div1_binding*/ ctx[15](null);
    			/*input2_binding*/ ctx[16](null);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $changeCount;
    	validate_store(changeCount, "changeCount");
    	component_subscribe($$self, changeCount, $$value => $$invalidate(10, $changeCount = $$value));
    	let { url = "" } = $$props;
    	let { scheme = {} } = $$props;
    	let { parentid = "" } = $$props;
    	let { urlElement } = $$props;
    	let { credentialsElement } = $$props;
    	let errorsElement;
    	let submitElement;
    	let visible = false;
    	const dispatch = createEventDispatcher();

    	function incChangeCounter(a) {
    		console.log("incChangeCounter", $changeCount, a);
    		set_store_value(changeCount, $changeCount += 1);
    	}

    	async function getSchema() {
    		$$invalidate(5, errorsElement.innerText = "", errorsElement);
    		submitElement.classList.add("inprogress");

    		try {
    			let fetchOptions = {
    				method: "POST",
    				body: JSON.stringify({
    					query: queryString,
    					variables: {},
    					operationName: null
    				})
    			};

    			if (credentialsElement.checked) {
    				console.log("Sending with credentials included = ", credentialsElement.checked);
    				fetchOptions.credentials = "include";
    			}

    			let resp = await fetch(urlElement.value, fetchOptions);
    			let newScheme = await resp.json();
    			clearSchema();
    			$$invalidate(0, scheme = newScheme);
    		} catch(err) {
    			console.error("get scheme error:", err);
    			$$invalidate(5, errorsElement.innerText = "get scheme error:" + err, errorsElement);
    		}

    		submitElement.classList.remove("inprogress");
    	}

    	function clearSchema() {
    		dispatch("clear", { text: "clear storage" });
    		console.log("Schemer: clearSchema:", parentid);
    	}

    	const writable_props = ["url", "scheme", "parentid", "urlElement", "credentialsElement"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Schemer> was created with unknown prop '${key}'`);
    	});

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, urlElement = $$value);
    		});
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, credentialsElement = $$value);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, errorsElement = $$value);
    		});
    	}

    	function input2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(6, submitElement = $$value);
    		});
    	}

    	const click_handler = e => {
    		$$invalidate(7, visible = !visible);
    	};

    	$$self.$set = $$props => {
    		if ("url" in $$props) $$invalidate(3, url = $$props.url);
    		if ("scheme" in $$props) $$invalidate(0, scheme = $$props.scheme);
    		if ("parentid" in $$props) $$invalidate(9, parentid = $$props.parentid);
    		if ("urlElement" in $$props) $$invalidate(1, urlElement = $$props.urlElement);
    		if ("credentialsElement" in $$props) $$invalidate(2, credentialsElement = $$props.credentialsElement);
    	};

    	$$self.$capture_state = () => {
    		return {
    			url,
    			scheme,
    			parentid,
    			urlElement,
    			credentialsElement,
    			errorsElement,
    			submitElement,
    			visible,
    			$changeCount
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(3, url = $$props.url);
    		if ("scheme" in $$props) $$invalidate(0, scheme = $$props.scheme);
    		if ("parentid" in $$props) $$invalidate(9, parentid = $$props.parentid);
    		if ("urlElement" in $$props) $$invalidate(1, urlElement = $$props.urlElement);
    		if ("credentialsElement" in $$props) $$invalidate(2, credentialsElement = $$props.credentialsElement);
    		if ("errorsElement" in $$props) $$invalidate(5, errorsElement = $$props.errorsElement);
    		if ("submitElement" in $$props) $$invalidate(6, submitElement = $$props.submitElement);
    		if ("visible" in $$props) $$invalidate(7, visible = $$props.visible);
    		if ("$changeCount" in $$props) changeCount.set($changeCount = $$props.$changeCount);
    	};

    	return [
    		scheme,
    		urlElement,
    		credentialsElement,
    		url,
    		getSchema,
    		errorsElement,
    		submitElement,
    		visible,
    		incChangeCounter,
    		parentid,
    		$changeCount,
    		dispatch,
    		clearSchema,
    		input0_binding,
    		input1_binding,
    		div1_binding,
    		input2_binding,
    		click_handler
    	];
    }

    class Schemer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			url: 3,
    			scheme: 0,
    			parentid: 9,
    			urlElement: 1,
    			credentialsElement: 2,
    			getSchema: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Schemer",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*urlElement*/ ctx[1] === undefined && !("urlElement" in props)) {
    			console_1.warn("<Schemer> was created without expected prop 'urlElement'");
    		}

    		if (/*credentialsElement*/ ctx[2] === undefined && !("credentialsElement" in props)) {
    			console_1.warn("<Schemer> was created without expected prop 'credentialsElement'");
    		}
    	}

    	get url() {
    		throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scheme() {
    		throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scheme(value) {
    		throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parentid() {
    		throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentid(value) {
    		throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get urlElement() {
    		throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set urlElement(value) {
    		throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get credentialsElement() {
    		throw new Error("<Schemer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set credentialsElement(value) {
    		throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getSchema() {
    		return this.$$.ctx[4];
    	}

    	set getSchema(value) {
    		throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Argument.svelte generated by Svelte v3.17.1 */
    const file$2 = "src/Argument.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let input0;
    	let input0_id_value;
    	let input0_disabled_value;
    	let t0;
    	let span0;
    	let t1_value = /*node*/ ctx[1].name + "";
    	let t1;
    	let span0_class_value;
    	let t2;
    	let input1;
    	let input1_id_value;
    	let input1_name_value;
    	let input1_disabled_value;
    	let input1_placeholder_value;
    	let t3;
    	let span2;
    	let t4;
    	let t5;
    	let span1;
    	let t6_value = (/*node*/ ctx[1].type.kind == "NON_NULL" ? " !" : "") + "";
    	let t6;
    	let span2_class_value;
    	let t7;
    	let br;
    	let span3;
    	let t8_value = /*node*/ ctx[1].description + "";
    	let t8;
    	let span3_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t0 = space();
    			span0 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			span2 = element("span");
    			t4 = text(/*graphqlType*/ ctx[6]);
    			t5 = space();
    			span1 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			br = element("br");
    			span3 = element("span");
    			t8 = text(t8_value);
    			attr_dev(input0, "id", input0_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[1].name + "-checkbox"));
    			attr_dev(input0, "type", "checkbox");
    			input0.disabled = input0_disabled_value = /*node*/ ctx[1].type.kind == "NON_NULL";
    			attr_dev(input0, "class", "svelte-17mekll");
    			add_location(input0, file$2, 99, 4, 2019);
    			attr_dev(span0, "class", span0_class_value = "argname " + (/*checked*/ ctx[2] ? "" : "disabled") + " svelte-17mekll");
    			add_location(span0, file$2, 100, 4, 2185);
    			attr_dev(input1, "id", input1_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[1].name + "-input"));
    			attr_dev(input1, "class", "input svelte-17mekll");
    			attr_dev(input1, "name", input1_name_value = /*node*/ ctx[1].name);
    			input1.disabled = input1_disabled_value = !/*checked*/ ctx[2];
    			attr_dev(input1, "placeholder", input1_placeholder_value = /*value*/ ctx[3] == "" ? "" : null);
    			add_location(input1, file$2, 101, 4, 2254);
    			attr_dev(span1, "class", "exclamation svelte-17mekll");
    			add_location(span1, file$2, 103, 4, 2503);
    			attr_dev(span2, "class", span2_class_value = "oftype " + (/*checked*/ ctx[2] ? "" : "disabled") + " svelte-17mekll");
    			add_location(span2, file$2, 102, 4, 2440);
    			add_location(br, file$2, 106, 4, 2595);
    			attr_dev(span3, "class", span3_class_value = "description " + (/*checked*/ ctx[2] ? "" : "disabled") + " svelte-17mekll");
    			add_location(span3, file$2, 106, 8, 2599);
    			attr_dev(div, "class", "field svelte-17mekll");
    			add_location(div, file$2, 98, 0, 1992);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			/*input0_binding*/ ctx[11](input0);
    			input0.checked = /*checked*/ ctx[2];
    			append_dev(div, t0);
    			append_dev(div, span0);
    			append_dev(span0, t1);
    			append_dev(div, t2);
    			append_dev(div, input1);
    			set_input_value(input1, /*value*/ ctx[3]);
    			/*input1_binding*/ ctx[14](input1);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(span2, t4);
    			append_dev(span2, t5);
    			append_dev(span2, span1);
    			append_dev(span1, t6);
    			append_dev(div, t7);
    			append_dev(div, br);
    			append_dev(div, span3);
    			append_dev(span3, t8);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[12]),
    				listen_dev(input0, "change", /*change_handler*/ ctx[10], false, false, false),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[13]),
    				listen_dev(input1, "change", /*change_handler_1*/ ctx[9], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*parentid, node*/ 3 && input0_id_value !== (input0_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[1].name + "-checkbox"))) {
    				attr_dev(input0, "id", input0_id_value);
    			}

    			if (dirty & /*node*/ 2 && input0_disabled_value !== (input0_disabled_value = /*node*/ ctx[1].type.kind == "NON_NULL")) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty & /*checked*/ 4) {
    				input0.checked = /*checked*/ ctx[2];
    			}

    			if (dirty & /*node*/ 2 && t1_value !== (t1_value = /*node*/ ctx[1].name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*checked*/ 4 && span0_class_value !== (span0_class_value = "argname " + (/*checked*/ ctx[2] ? "" : "disabled") + " svelte-17mekll")) {
    				attr_dev(span0, "class", span0_class_value);
    			}

    			if (dirty & /*parentid, node*/ 3 && input1_id_value !== (input1_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[1].name + "-input"))) {
    				attr_dev(input1, "id", input1_id_value);
    			}

    			if (dirty & /*node*/ 2 && input1_name_value !== (input1_name_value = /*node*/ ctx[1].name)) {
    				attr_dev(input1, "name", input1_name_value);
    			}

    			if (dirty & /*checked*/ 4 && input1_disabled_value !== (input1_disabled_value = !/*checked*/ ctx[2])) {
    				prop_dev(input1, "disabled", input1_disabled_value);
    			}

    			if (dirty & /*value*/ 8 && input1_placeholder_value !== (input1_placeholder_value = /*value*/ ctx[3] == "" ? "" : null)) {
    				attr_dev(input1, "placeholder", input1_placeholder_value);
    			}

    			if (dirty & /*value*/ 8 && input1.value !== /*value*/ ctx[3]) {
    				set_input_value(input1, /*value*/ ctx[3]);
    			}

    			if (dirty & /*node*/ 2 && t6_value !== (t6_value = (/*node*/ ctx[1].type.kind == "NON_NULL" ? " !" : "") + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*checked*/ 4 && span2_class_value !== (span2_class_value = "oftype " + (/*checked*/ ctx[2] ? "" : "disabled") + " svelte-17mekll")) {
    				attr_dev(span2, "class", span2_class_value);
    			}

    			if (dirty & /*node*/ 2 && t8_value !== (t8_value = /*node*/ ctx[1].description + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*checked*/ 4 && span3_class_value !== (span3_class_value = "description " + (/*checked*/ ctx[2] ? "" : "disabled") + " svelte-17mekll")) {
    				attr_dev(span3, "class", span3_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*input0_binding*/ ctx[11](null);
    			/*input1_binding*/ ctx[14](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { parentid = "" } = $$props;
    	let { node = {} } = $$props;

    	let { getText = function () {
    		if (!checkboxElement.checked) return "";
    		let value = inputElement.value;

    		if (graphqlType == "String") {
    			value = `"${value.replace(/"/g, "\\\"")}"`;
    		}

    		return `${node.name}: ${value}`;
    	} } = $$props;

    	let checked = true;
    	let graphqlType = node.type.name || node.type.ofType.name;
    	let value;

    	if (node.defaultValue) {
    		value = graphqlType == "String"
    		? node.defaultValue.replace(/"/g, "")
    		: node.defaultValue;
    	} else {
    		value = graphqlType == "Int"
    		? 0
    		: graphqlType == "Boolean"
    			? false
    			: graphqlType == "String"
    				? node.name.replace(/_/g, " ")
    				: null;
    	}

    	let checkboxElement;
    	let inputElement;
    	let inputType = graphqlType == "Int" ? "number" : "text";

    	onMount(async () => {
    		inputElement.setAttribute("type", inputType);
    	});

    	const writable_props = ["parentid", "node", "getText"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Argument> was created with unknown prop '${key}'`);
    	});

    	function change_handler_1(event) {
    		bubble($$self, event);
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, checkboxElement = $$value);
    		});
    	}

    	function input0_change_handler() {
    		checked = this.checked;
    		$$invalidate(2, checked);
    	}

    	function input1_input_handler() {
    		value = this.value;
    		$$invalidate(3, value);
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, inputElement = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("node" in $$props) $$invalidate(1, node = $$props.node);
    		if ("getText" in $$props) $$invalidate(7, getText = $$props.getText);
    	};

    	$$self.$capture_state = () => {
    		return {
    			parentid,
    			node,
    			getText,
    			checked,
    			graphqlType,
    			value,
    			checkboxElement,
    			inputElement,
    			inputType
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("node" in $$props) $$invalidate(1, node = $$props.node);
    		if ("getText" in $$props) $$invalidate(7, getText = $$props.getText);
    		if ("checked" in $$props) $$invalidate(2, checked = $$props.checked);
    		if ("graphqlType" in $$props) $$invalidate(6, graphqlType = $$props.graphqlType);
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("checkboxElement" in $$props) $$invalidate(4, checkboxElement = $$props.checkboxElement);
    		if ("inputElement" in $$props) $$invalidate(5, inputElement = $$props.inputElement);
    		if ("inputType" in $$props) inputType = $$props.inputType;
    	};

    	return [
    		parentid,
    		node,
    		checked,
    		value,
    		checkboxElement,
    		inputElement,
    		graphqlType,
    		getText,
    		inputType,
    		change_handler_1,
    		change_handler,
    		input0_binding,
    		input0_change_handler,
    		input1_input_handler,
    		input1_binding
    	];
    }

    class Argument extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { parentid: 0, node: 1, getText: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Argument",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get parentid() {
    		throw new Error("<Argument>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentid(value) {
    		throw new Error("<Argument>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get node() {
    		throw new Error("<Argument>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set node(value) {
    		throw new Error("<Argument>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getText() {
    		throw new Error("<Argument>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getText(value) {
    		throw new Error("<Argument>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TypeField.svelte generated by Svelte v3.17.1 */
    const file$3 = "src/TypeField.svelte";

    // (50:4) {#if showCheckbox}
    function create_if_block$1(ctx) {
    	let input;
    	let input_id_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "checkbox");
    			input.checked = true;
    			attr_dev(input, "id", input_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*fieldName*/ ctx[8]));
    			attr_dev(input, "class", "svelte-1y7pqhv");
    			add_location(input, file$3, 50, 8, 894);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[12](input);
    			dispose = listen_dev(input, "change", /*change_handler*/ ctx[11], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parentid*/ 1 && input_id_value !== (input_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*fieldName*/ ctx[8]))) {
    				attr_dev(input, "id", input_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[12](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(50:4) {#if showCheckbox}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let t0;
    	let span0;
    	let t2;
    	let updating_getText;
    	let t3;
    	let br;
    	let span1;
    	let t4_value = /*node*/ ctx[2].description + "";
    	let t4;
    	let current;
    	let if_block = /*showCheckbox*/ ctx[3] && create_if_block$1(ctx);

    	function type_getText_binding(value) {
    		/*type_getText_binding*/ ctx[13].call(null, value);
    	}

    	let type_props = {
    		scheme: /*scheme*/ ctx[1],
    		typeName: /*typeName*/ ctx[9],
    		showCheckbox: /*showCheckbox*/ ctx[3],
    		level: /*level*/ ctx[4],
    		padding: /*padding*/ ctx[5],
    		parentid: "" + (/*parentid*/ ctx[0] + "-" + /*fieldName*/ ctx[8] + "-type")
    	};

    	if (/*getTypeText*/ ctx[6] !== void 0) {
    		type_props.getText = /*getTypeText*/ ctx[6];
    	}

    	const type = new Type({ props: type_props, $$inline: true });
    	binding_callbacks.push(() => bind(type, "getText", type_getText_binding));
    	type.$on("change", /*change_handler_1*/ ctx[14]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = `${/*fieldName*/ ctx[8]}`;
    			t2 = space();
    			create_component(type.$$.fragment);
    			t3 = space();
    			br = element("br");
    			span1 = element("span");
    			t4 = text(t4_value);
    			attr_dev(span0, "class", "field-name svelte-1y7pqhv");
    			add_location(span0, file$3, 52, 4, 1007);
    			attr_dev(br, "class", "svelte-1y7pqhv");
    			add_location(br, file$3, 54, 4, 1215);
    			attr_dev(span1, "class", "field-description svelte-1y7pqhv");
    			add_location(span1, file$3, 54, 8, 1219);
    			attr_dev(div, "class", "field svelte-1y7pqhv");
    			add_location(div, file$3, 48, 0, 841);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, span0);
    			append_dev(div, t2);
    			mount_component(type, div, null);
    			append_dev(div, t3);
    			append_dev(div, br);
    			append_dev(div, span1);
    			append_dev(span1, t4);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showCheckbox*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const type_changes = {};
    			if (dirty & /*scheme*/ 2) type_changes.scheme = /*scheme*/ ctx[1];
    			if (dirty & /*showCheckbox*/ 8) type_changes.showCheckbox = /*showCheckbox*/ ctx[3];
    			if (dirty & /*level*/ 16) type_changes.level = /*level*/ ctx[4];
    			if (dirty & /*padding*/ 32) type_changes.padding = /*padding*/ ctx[5];
    			if (dirty & /*parentid*/ 1) type_changes.parentid = "" + (/*parentid*/ ctx[0] + "-" + /*fieldName*/ ctx[8] + "-type");

    			if (!updating_getText && dirty & /*getTypeText*/ 64) {
    				updating_getText = true;
    				type_changes.getText = /*getTypeText*/ ctx[6];
    				add_flush_callback(() => updating_getText = false);
    			}

    			type.$set(type_changes);
    			if ((!current || dirty & /*node*/ 4) && t4_value !== (t4_value = /*node*/ ctx[2].description + "")) set_data_dev(t4, t4_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(type.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(type.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			destroy_component(type);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { parentid = "" } = $$props;
    	let { scheme } = $$props;
    	let { node } = $$props;
    	let { showCheckbox = true } = $$props;
    	let { level = 0 } = $$props;
    	let { padding = "  " } = $$props;

    	let { getText = function (e) {
    		if (!checkboxElement) return "";
    		if (checkboxElement.checked == false) return "";
    		let value = fieldName + getTypeText();
    		return value;
    	} } = $$props;

    	let fieldName = node.name;

    	let typeName = node.type.kind == "LIST"
    	? node.type.ofType.name
    	: node.type.name;

    	let getTypeText;
    	let checkboxElement;
    	const writable_props = ["parentid", "scheme", "node", "showCheckbox", "level", "padding", "getText"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TypeField> was created with unknown prop '${key}'`);
    	});

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(7, checkboxElement = $$value);
    		});
    	}

    	function type_getText_binding(value) {
    		getTypeText = value;
    		$$invalidate(6, getTypeText);
    	}

    	function change_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("scheme" in $$props) $$invalidate(1, scheme = $$props.scheme);
    		if ("node" in $$props) $$invalidate(2, node = $$props.node);
    		if ("showCheckbox" in $$props) $$invalidate(3, showCheckbox = $$props.showCheckbox);
    		if ("level" in $$props) $$invalidate(4, level = $$props.level);
    		if ("padding" in $$props) $$invalidate(5, padding = $$props.padding);
    		if ("getText" in $$props) $$invalidate(10, getText = $$props.getText);
    	};

    	$$self.$capture_state = () => {
    		return {
    			parentid,
    			scheme,
    			node,
    			showCheckbox,
    			level,
    			padding,
    			getText,
    			fieldName,
    			typeName,
    			getTypeText,
    			checkboxElement
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("scheme" in $$props) $$invalidate(1, scheme = $$props.scheme);
    		if ("node" in $$props) $$invalidate(2, node = $$props.node);
    		if ("showCheckbox" in $$props) $$invalidate(3, showCheckbox = $$props.showCheckbox);
    		if ("level" in $$props) $$invalidate(4, level = $$props.level);
    		if ("padding" in $$props) $$invalidate(5, padding = $$props.padding);
    		if ("getText" in $$props) $$invalidate(10, getText = $$props.getText);
    		if ("fieldName" in $$props) $$invalidate(8, fieldName = $$props.fieldName);
    		if ("typeName" in $$props) $$invalidate(9, typeName = $$props.typeName);
    		if ("getTypeText" in $$props) $$invalidate(6, getTypeText = $$props.getTypeText);
    		if ("checkboxElement" in $$props) $$invalidate(7, checkboxElement = $$props.checkboxElement);
    	};

    	return [
    		parentid,
    		scheme,
    		node,
    		showCheckbox,
    		level,
    		padding,
    		getTypeText,
    		checkboxElement,
    		fieldName,
    		typeName,
    		getText,
    		change_handler,
    		input_binding,
    		type_getText_binding,
    		change_handler_1
    	];
    }

    class TypeField extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			parentid: 0,
    			scheme: 1,
    			node: 2,
    			showCheckbox: 3,
    			level: 4,
    			padding: 5,
    			getText: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TypeField",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*scheme*/ ctx[1] === undefined && !("scheme" in props)) {
    			console.warn("<TypeField> was created without expected prop 'scheme'");
    		}

    		if (/*node*/ ctx[2] === undefined && !("node" in props)) {
    			console.warn("<TypeField> was created without expected prop 'node'");
    		}
    	}

    	get parentid() {
    		throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentid(value) {
    		throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scheme() {
    		throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scheme(value) {
    		throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get node() {
    		throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set node(value) {
    		throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showCheckbox() {
    		throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showCheckbox(value) {
    		throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get level() {
    		throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set level(value) {
    		throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get padding() {
    		throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set padding(value) {
    		throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getText() {
    		throw new Error("<TypeField>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getText(value) {
    		throw new Error("<TypeField>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Type.svelte generated by Svelte v3.17.1 */
    const file$4 = "src/Type.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (115:0) {#if node}
    function create_if_block$2(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*node*/ ctx[8].kind == "SCALAR") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "self svelte-jn0n43");
    			add_location(div, file$4, 115, 0, 2281);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(115:0) {#if node}",
    		ctx
    	});

    	return block;
    }

    // (119:4) {:else}
    function create_else_block(ctx) {
    	let a;
    	let t0;
    	let a_class_value;
    	let t1;
    	let div;
    	let span;
    	let t3;
    	let current;
    	let dispose;
    	let if_block = /*node*/ ctx[8].fields && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(/*typeName*/ ctx[2]);
    			t1 = space();
    			div = element("div");
    			span = element("span");
    			span.textContent = `${/*node*/ ctx[8].description}`;
    			t3 = space();
    			if (if_block) if_block.c();
    			attr_dev(a, "class", a_class_value = "" + (null_to_empty(/*vis*/ ctx[7] ? "opened" : "closed") + " svelte-jn0n43"));
    			attr_dev(a, "href", "");
    			add_location(a, file$4, 119, 8, 2403);
    			attr_dev(span, "class", "description svelte-jn0n43");
    			add_location(span, file$4, 121, 16, 2585);
    			attr_dev(div, "class", "frame svelte-jn0n43");
    			set_style(div, "display", /*vis*/ ctx[7] ? "block" : "none");
    			add_location(div, file$4, 120, 12, 2512);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(div, t3);
    			if (if_block) if_block.m(div, null);
    			current = true;
    			dispose = listen_dev(a, "click", prevent_default(/*click_handler*/ ctx[10]), false, true, false);
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*typeName*/ 4) set_data_dev(t0, /*typeName*/ ctx[2]);

    			if (!current || dirty & /*vis*/ 128 && a_class_value !== (a_class_value = "" + (null_to_empty(/*vis*/ ctx[7] ? "opened" : "closed") + " svelte-jn0n43"))) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (/*node*/ ctx[8].fields) if_block.p(ctx, dirty);

    			if (!current || dirty & /*vis*/ 128) {
    				set_style(div, "display", /*vis*/ ctx[7] ? "block" : "none");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(119:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (117:4) {#if node.kind=="SCALAR"}
    function create_if_block_1$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*typeName*/ ctx[2]);
    			attr_dev(span, "class", "scalar-type svelte-jn0n43");
    			add_location(span, file$4, 117, 9, 2339);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*typeName*/ 4) set_data_dev(t, /*typeName*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(117:4) {#if node.kind==\\\"SCALAR\\\"}",
    		ctx
    	});

    	return block;
    }

    // (123:16) {#if node.fields}
    function create_if_block_2(ctx) {
    	let div;
    	let current;
    	let each_value = /*node*/ ctx[8].fields;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "fieldlist svelte-jn0n43");
    			add_location(div, file$4, 123, 20, 2691);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*showCheckbox, scheme, level, padding, node, parentid, typeName, fieldFunctions*/ 383) {
    				each_value = /*node*/ ctx[8].fields;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(123:16) {#if node.fields}",
    		ctx
    	});

    	return block;
    }

    // (125:20) {#each node.fields as f,ind}
    function create_each_block(ctx) {
    	let updating_getText;
    	let current;

    	function typefield_getText_binding(value) {
    		/*typefield_getText_binding*/ ctx[11].call(null, value, /*f*/ ctx[13]);
    	}

    	let typefield_props = {
    		showCheckbox: /*showCheckbox*/ ctx[3],
    		scheme: /*scheme*/ ctx[1],
    		level: /*level*/ ctx[4] + 1,
    		padding: /*padding*/ ctx[5],
    		node: /*f*/ ctx[13],
    		parentid: "" + (/*parentid*/ ctx[0] + "-" + /*typeName*/ ctx[2])
    	};

    	if (/*fieldFunctions*/ ctx[6][/*f*/ ctx[13].name] !== void 0) {
    		typefield_props.getText = /*fieldFunctions*/ ctx[6][/*f*/ ctx[13].name];
    	}

    	const typefield = new TypeField({ props: typefield_props, $$inline: true });
    	binding_callbacks.push(() => bind(typefield, "getText", typefield_getText_binding));
    	typefield.$on("change", /*change_handler*/ ctx[12]);

    	const block = {
    		c: function create() {
    			create_component(typefield.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(typefield, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const typefield_changes = {};
    			if (dirty & /*showCheckbox*/ 8) typefield_changes.showCheckbox = /*showCheckbox*/ ctx[3];
    			if (dirty & /*scheme*/ 2) typefield_changes.scheme = /*scheme*/ ctx[1];
    			if (dirty & /*level*/ 16) typefield_changes.level = /*level*/ ctx[4] + 1;
    			if (dirty & /*padding*/ 32) typefield_changes.padding = /*padding*/ ctx[5];
    			if (dirty & /*parentid, typeName*/ 5) typefield_changes.parentid = "" + (/*parentid*/ ctx[0] + "-" + /*typeName*/ ctx[2]);

    			if (!updating_getText && dirty & /*fieldFunctions, node*/ 320) {
    				updating_getText = true;
    				typefield_changes.getText = /*fieldFunctions*/ ctx[6][/*f*/ ctx[13].name];
    				add_flush_callback(() => updating_getText = false);
    			}

    			typefield.$set(typefield_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(typefield.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(typefield.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(typefield, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(125:20) {#each node.fields as f,ind}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*node*/ ctx[8] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*node*/ ctx[8]) if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getNode(scheme, typeName) {
    	if (scheme && scheme.data && scheme.data.__schema) {
    		let nodes = scheme.data.__schema.types.filter(t => t.name == typeName);

    		if (nodes.length > 0) {
    			return nodes[0];
    		}

    		return null;
    	}

    	return null;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { parentid = "" } = $$props;
    	let { scheme = {} } = $$props;
    	let { typeName = "" } = $$props;
    	let { showCheckbox = true } = $$props;
    	let { level = 0 } = $$props;
    	let { padding = "  " } = $$props;

    	let { getText = function () {
    		let a = [];

    		for (let key in fieldFunctions) {
    			let v = fieldFunctions[key]();
    			if (v) a.push(padding.repeat(level + 1) + v);
    		}

    		if (a.length > 0) return " {\n" + a.join("\n") + "\n" + padding.repeat(level) + "}";
    		return "";
    	} } = $$props;

    	let fieldFunctions = {};
    	let node = getNode(scheme, typeName);
    	let vis = false;

    	const writable_props = [
    		"parentid",
    		"scheme",
    		"typeName",
    		"showCheckbox",
    		"level",
    		"padding",
    		"getText"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Type> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => $$invalidate(7, vis = !vis);

    	function typefield_getText_binding(value, f) {
    		fieldFunctions[f.name] = value;
    		$$invalidate(6, fieldFunctions);
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("scheme" in $$props) $$invalidate(1, scheme = $$props.scheme);
    		if ("typeName" in $$props) $$invalidate(2, typeName = $$props.typeName);
    		if ("showCheckbox" in $$props) $$invalidate(3, showCheckbox = $$props.showCheckbox);
    		if ("level" in $$props) $$invalidate(4, level = $$props.level);
    		if ("padding" in $$props) $$invalidate(5, padding = $$props.padding);
    		if ("getText" in $$props) $$invalidate(9, getText = $$props.getText);
    	};

    	$$self.$capture_state = () => {
    		return {
    			parentid,
    			scheme,
    			typeName,
    			showCheckbox,
    			level,
    			padding,
    			getText,
    			fieldFunctions,
    			node,
    			vis
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("scheme" in $$props) $$invalidate(1, scheme = $$props.scheme);
    		if ("typeName" in $$props) $$invalidate(2, typeName = $$props.typeName);
    		if ("showCheckbox" in $$props) $$invalidate(3, showCheckbox = $$props.showCheckbox);
    		if ("level" in $$props) $$invalidate(4, level = $$props.level);
    		if ("padding" in $$props) $$invalidate(5, padding = $$props.padding);
    		if ("getText" in $$props) $$invalidate(9, getText = $$props.getText);
    		if ("fieldFunctions" in $$props) $$invalidate(6, fieldFunctions = $$props.fieldFunctions);
    		if ("node" in $$props) $$invalidate(8, node = $$props.node);
    		if ("vis" in $$props) $$invalidate(7, vis = $$props.vis);
    	};

    	return [
    		parentid,
    		scheme,
    		typeName,
    		showCheckbox,
    		level,
    		padding,
    		fieldFunctions,
    		vis,
    		node,
    		getText,
    		click_handler,
    		typefield_getText_binding,
    		change_handler
    	];
    }

    class Type extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			parentid: 0,
    			scheme: 1,
    			typeName: 2,
    			showCheckbox: 3,
    			level: 4,
    			padding: 5,
    			getText: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Type",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get parentid() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentid(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scheme() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scheme(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get typeName() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set typeName(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showCheckbox() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showCheckbox(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get level() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set level(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get padding() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set padding(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getText() {
    		throw new Error("<Type>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getText(value) {
    		throw new Error("<Type>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Func.svelte generated by Svelte v3.17.1 */

    const { Object: Object_1$1, console: console_1$1 } = globals;
    const file$5 = "src/Func.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[47] = list[i];
    	return child_ctx;
    }

    // (441:16) {#if node.args}
    function create_if_block$3(ctx) {
    	let h3;
    	let t0_value = /*node*/ ctx[2].name + "";
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let t4;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*node*/ ctx[2].args;
    	const get_key = ctx => /*arg*/ ctx[47].name;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = text("(...)");
    			t2 = space();
    			div0 = element("div");
    			div0.textContent = "ARGUMENTS";
    			t4 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "svelte-ko15t2");
    			add_location(h3, file$5, 441, 16, 9601);
    			attr_dev(div0, "class", "header svelte-ko15t2");
    			add_location(div0, file$5, 442, 16, 9643);
    			attr_dev(div1, "class", "fieldlist svelte-ko15t2");
    			add_location(div1, file$5, 443, 16, 9696);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*node*/ 4) && t0_value !== (t0_value = /*node*/ ctx[2].name + "")) set_data_dev(t0, t0_value);
    			const each_value = /*node*/ ctx[2].args;
    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    			check_outros();
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(441:16) {#if node.args}",
    		ctx
    	});

    	return block;
    }

    // (445:20) {#each node.args as arg (arg.name)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let updating_getText;
    	let current;

    	function argument_getText_binding(value) {
    		/*argument_getText_binding*/ ctx[36].call(null, value, /*arg*/ ctx[47]);
    	}

    	let argument_props = {
    		node: /*arg*/ ctx[47],
    		parentid: "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-argument")
    	};

    	if (/*getArgFunctions*/ ctx[16][/*arg*/ ctx[47].name] !== void 0) {
    		argument_props.getText = /*getArgFunctions*/ ctx[16][/*arg*/ ctx[47].name];
    	}

    	const argument = new Argument({ props: argument_props, $$inline: true });
    	binding_callbacks.push(() => bind(argument, "getText", argument_getText_binding));
    	argument.$on("change", /*generateQuery*/ ctx[19]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(argument.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(argument, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const argument_changes = {};
    			if (dirty[0] & /*node*/ 4) argument_changes.node = /*arg*/ ctx[47];
    			if (dirty[0] & /*parentid, node*/ 5) argument_changes.parentid = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-argument");

    			if (!updating_getText && dirty[0] & /*getArgFunctions, node*/ 65540) {
    				updating_getText = true;
    				argument_changes.getText = /*getArgFunctions*/ ctx[16][/*arg*/ ctx[47].name];
    				add_flush_callback(() => updating_getText = false);
    			}

    			argument.$set(argument_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(argument.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(argument.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(argument, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(445:20) {#each node.args as arg (arg.name)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div24;
    	let div0;
    	let a;
    	let t0_value = /*node*/ ctx[2].name + "";
    	let t0;
    	let t1;
    	let a_class_value;
    	let t2;
    	let span0;
    	let t3;
    	let span1;
    	let t4_value = /*node*/ ctx[2].description + "";
    	let t4;
    	let t5;
    	let div23;
    	let div3;
    	let t6;
    	let div2;
    	let div1;
    	let t7;
    	let t8_value = (/*node*/ ctx[2].type.kind == "LIST" ? "[...]" : "") + "";
    	let t8;
    	let t9;
    	let updating_getText;
    	let t10;
    	let form_1;
    	let div6;
    	let div4;
    	let t12;
    	let div5;
    	let textarea0;
    	let textarea0_id_value;
    	let t13;
    	let div9;
    	let div7;
    	let t15;
    	let div8;
    	let textarea1;
    	let textarea1_id_value;
    	let t16;
    	let div12;
    	let div10;
    	let t18;
    	let div11;
    	let span2;
    	let br;
    	let t20;
    	let input0;
    	let t21;
    	let div13;
    	let input1;
    	let t22;
    	let div22;
    	let div14;
    	let t24;
    	let div17;
    	let div15;
    	let t25;
    	let span3;
    	let t26_value = (/*response*/ ctx[7] ? "" : null) + "";
    	let t26;
    	let t27;
    	let div16;
    	let t28;
    	let div21;
    	let div18;
    	let span4;
    	let t30;
    	let input2;
    	let t31;
    	let div19;
    	let textarea2;
    	let textarea2_id_value;
    	let t32;
    	let div20;
    	let span5;
    	let t33;
    	let span6;
    	let current;
    	let dispose;
    	let if_block = /*node*/ ctx[2].args && create_if_block$3(ctx);

    	function type_getText_binding(value) {
    		/*type_getText_binding*/ ctx[37].call(null, value);
    	}

    	let type_props = {
    		typeName: /*node*/ ctx[2].type.name || /*node*/ ctx[2].type.ofType.name,
    		scheme: /*scheme*/ ctx[1],
    		parentid: "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name),
    		level: 1
    	};

    	if (/*getTypeText*/ ctx[15] !== void 0) {
    		type_props.getText = /*getTypeText*/ ctx[15];
    	}

    	const type = new Type({ props: type_props, $$inline: true });
    	binding_callbacks.push(() => bind(type, "getText", type_getText_binding));
    	type.$on("change", /*generateQuery*/ ctx[19]);

    	const block = {
    		c: function create() {
    			div24 = element("div");
    			div0 = element("div");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = text("(...)");
    			t2 = space();
    			span0 = element("span");
    			t3 = space();
    			span1 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			div23 = element("div");
    			div3 = element("div");
    			if (if_block) if_block.c();
    			t6 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t7 = text("RETURN ");
    			t8 = text(t8_value);
    			t9 = space();
    			create_component(type.$$.fragment);
    			t10 = space();
    			form_1 = element("form");
    			div6 = element("div");
    			div4 = element("div");
    			div4.textContent = "QUERY";
    			t12 = space();
    			div5 = element("div");
    			textarea0 = element("textarea");
    			t13 = space();
    			div9 = element("div");
    			div7 = element("div");
    			div7.textContent = "VARIABLES";
    			t15 = space();
    			div8 = element("div");
    			textarea1 = element("textarea");
    			t16 = space();
    			div12 = element("div");
    			div10 = element("div");
    			div10.textContent = "FILE";
    			t18 = space();
    			div11 = element("div");
    			span2 = element("span");
    			span2.textContent = "name=\"file\"";
    			br = element("br");
    			t20 = space();
    			input0 = element("input");
    			t21 = space();
    			div13 = element("div");
    			input1 = element("input");
    			t22 = space();
    			div22 = element("div");
    			div14 = element("div");
    			div14.textContent = "RESPONSE";
    			t24 = space();
    			div17 = element("div");
    			div15 = element("div");
    			t25 = text("response = ");
    			span3 = element("span");
    			t26 = text(t26_value);
    			t27 = space();
    			div16 = element("div");
    			t28 = space();
    			div21 = element("div");
    			div18 = element("div");
    			span4 = element("span");
    			span4.textContent = "DEFINE TEST &";
    			t30 = space();
    			input2 = element("input");
    			t31 = space();
    			div19 = element("div");
    			textarea2 = element("textarea");
    			t32 = space();
    			div20 = element("div");
    			span5 = element("span");
    			t33 = space();
    			span6 = element("span");
    			attr_dev(a, "class", a_class_value = "name " + (/*vis*/ ctx[5] ? "opened" : "closed") + " svelte-ko15t2");
    			attr_dev(a, "href", "");
    			add_location(a, file$5, 430, 8, 9089);
    			attr_dev(span0, "class", "test-result svelte-ko15t2");
    			add_location(span0, file$5, 431, 8, 9208);
    			attr_dev(span1, "class", "description svelte-ko15t2");
    			add_location(span1, file$5, 432, 8, 9269);
    			attr_dev(div0, "class", "outer svelte-ko15t2");
    			add_location(div0, file$5, 429, 4, 9061);
    			attr_dev(div1, "class", "header svelte-ko15t2");
    			add_location(div1, file$5, 452, 20, 10075);
    			add_location(div2, file$5, 451, 16, 10049);
    			attr_dev(div3, "class", "form-area svelte-ko15t2");
    			add_location(div3, file$5, 438, 8, 9507);
    			attr_dev(div4, "class", "header svelte-ko15t2");
    			add_location(div4, file$5, 461, 16, 10493);
    			attr_dev(textarea0, "id", textarea0_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-query"));
    			attr_dev(textarea0, "name", "query");
    			textarea0.value = /*request*/ ctx[6];
    			attr_dev(textarea0, "class", "svelte-ko15t2");
    			add_location(textarea0, file$5, 463, 20, 10610);
    			attr_dev(div5, "class", "queryFrame svelte-ko15t2");
    			add_location(div5, file$5, 462, 16, 10542);
    			add_location(div6, file$5, 460, 12, 10471);
    			attr_dev(div7, "class", "header svelte-ko15t2");
    			add_location(div7, file$5, 467, 16, 10820);
    			attr_dev(textarea1, "id", textarea1_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-variables"));
    			attr_dev(textarea1, "name", "variables");
    			attr_dev(textarea1, "class", "svelte-ko15t2");
    			add_location(textarea1, file$5, 469, 20, 10949);
    			attr_dev(div8, "class", "variablesFrame svelte-ko15t2");
    			add_location(div8, file$5, 468, 16, 10873);
    			add_location(div9, file$5, 466, 12, 10798);
    			attr_dev(div10, "class", "header svelte-ko15t2");
    			add_location(div10, file$5, 473, 16, 11161);
    			add_location(span2, file$5, 476, 20, 11414);
    			add_location(br, file$5, 476, 44, 11438);
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "name", "file");
    			add_location(input0, file$5, 477, 20, 11463);
    			attr_dev(div11, "class", "margined svelte-ko15t2");
    			add_location(div11, file$5, 474, 16, 11208);
    			add_location(div12, file$5, 472, 12, 11139);
    			attr_dev(input1, "type", "submit");
    			attr_dev(input1, "class", "button  svelte-ko15t2");
    			input1.value = "query & run test";
    			add_location(input1, file$5, 481, 16, 11587);
    			attr_dev(div13, "class", "buttons svelte-ko15t2");
    			add_location(div13, file$5, 480, 12, 11549);
    			attr_dev(form_1, "class", "svelte-ko15t2");
    			add_location(form_1, file$5, 459, 8, 10412);
    			attr_dev(div14, "class", "header svelte-ko15t2");
    			add_location(div14, file$5, 487, 12, 11736);
    			attr_dev(span3, "class", "json-literal");
    			add_location(span3, file$5, 489, 32, 11843);
    			add_location(div15, file$5, 489, 16, 11827);
    			attr_dev(div16, "class", "response svelte-ko15t2");
    			add_location(div16, file$5, 490, 16, 11918);
    			attr_dev(div17, "class", "response-area svelte-ko15t2");
    			add_location(div17, file$5, 488, 12, 11783);
    			add_location(span4, file$5, 494, 20, 12066);
    			attr_dev(input2, "type", "button");
    			attr_dev(input2, "class", "button svelte-ko15t2");
    			input2.value = "run ▶";
    			add_location(input2, file$5, 495, 20, 12114);
    			attr_dev(div18, "class", "header svelte-ko15t2");
    			add_location(div18, file$5, 493, 16, 12025);
    			attr_dev(textarea2, "id", textarea2_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-eval-text"));
    			textarea2.value = "response && !response.errors";
    			attr_dev(textarea2, "class", "svelte-ko15t2");
    			add_location(textarea2, file$5, 498, 20, 12296);
    			attr_dev(div19, "class", "evalFrame svelte-ko15t2");
    			add_location(div19, file$5, 497, 16, 12230);
    			attr_dev(span5, "class", "eval-result svelte-ko15t2");
    			add_location(span5, file$5, 502, 20, 12624);
    			attr_dev(span6, "class", "eval-errors svelte-ko15t2");
    			add_location(span6, file$5, 503, 20, 12696);
    			attr_dev(div20, "class", "buttons2 svelte-ko15t2");
    			add_location(div20, file$5, 500, 16, 12478);
    			add_location(div21, file$5, 492, 12, 12003);
    			attr_dev(div22, "class", "result-panel svelte-ko15t2");
    			add_location(div22, file$5, 486, 8, 11697);
    			attr_dev(div23, "class", "root shadow svelte-ko15t2");
    			set_style(div23, "display", /*vis*/ ctx[5] ? "grid" : "none");
    			add_location(div23, file$5, 434, 4, 9336);
    			add_location(div24, file$5, 428, 0, 9050);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div24, anchor);
    			append_dev(div24, div0);
    			append_dev(div0, a);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(div0, t2);
    			append_dev(div0, span0);
    			span0.innerHTML = /*testResult*/ ctx[3];
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			append_dev(span1, t4);
    			append_dev(div24, t5);
    			append_dev(div24, div23);
    			append_dev(div23, div3);
    			if (if_block) if_block.m(div3, null);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			append_dev(div2, t9);
    			mount_component(type, div2, null);
    			/*div3_binding*/ ctx[38](div3);
    			append_dev(div23, t10);
    			append_dev(div23, form_1);
    			append_dev(form_1, div6);
    			append_dev(div6, div4);
    			append_dev(div6, t12);
    			append_dev(div6, div5);
    			append_dev(div5, textarea0);
    			/*textarea0_binding*/ ctx[39](textarea0);
    			/*div5_binding*/ ctx[40](div5);
    			append_dev(form_1, t13);
    			append_dev(form_1, div9);
    			append_dev(div9, div7);
    			append_dev(div9, t15);
    			append_dev(div9, div8);
    			append_dev(div8, textarea1);
    			/*textarea1_binding*/ ctx[41](textarea1);
    			/*div8_binding*/ ctx[42](div8);
    			append_dev(form_1, t16);
    			append_dev(form_1, div12);
    			append_dev(div12, div10);
    			append_dev(div12, t18);
    			append_dev(div12, div11);
    			append_dev(div11, span2);
    			append_dev(div11, br);
    			append_dev(div11, t20);
    			append_dev(div11, input0);
    			append_dev(form_1, t21);
    			append_dev(form_1, div13);
    			append_dev(div13, input1);
    			/*form_1_binding*/ ctx[43](form_1);
    			append_dev(div23, t22);
    			append_dev(div23, div22);
    			append_dev(div22, div14);
    			append_dev(div22, t24);
    			append_dev(div22, div17);
    			append_dev(div17, div15);
    			append_dev(div15, t25);
    			append_dev(div15, span3);
    			append_dev(span3, t26);
    			append_dev(div17, t27);
    			append_dev(div17, div16);
    			/*div16_binding*/ ctx[44](div16);
    			append_dev(div22, t28);
    			append_dev(div22, div21);
    			append_dev(div21, div18);
    			append_dev(div18, span4);
    			append_dev(div18, t30);
    			append_dev(div18, input2);
    			append_dev(div21, t31);
    			append_dev(div21, div19);
    			append_dev(div19, textarea2);
    			/*textarea2_binding*/ ctx[45](textarea2);
    			/*div19_binding*/ ctx[46](div19);
    			append_dev(div21, t32);
    			append_dev(div21, div20);
    			append_dev(div20, span5);
    			span5.innerHTML = /*testResult*/ ctx[3];
    			append_dev(div20, t33);
    			append_dev(div20, span6);
    			span6.innerHTML = /*evalErrors*/ ctx[4];
    			current = true;

    			dispose = [
    				listen_dev(a, "click", prevent_default(/*toggleVisibility*/ ctx[23]), false, true, false),
    				listen_dev(textarea0, "change", /*incChangeCounter*/ ctx[22], false, false, false),
    				listen_dev(textarea1, "change", /*incChangeCounter*/ ctx[22], false, false, false),
    				listen_dev(form_1, "submit", /*submitForm*/ ctx[20], false, false, false),
    				listen_dev(input2, "click", /*evaluate*/ ctx[21], false, false, false),
    				listen_dev(textarea2, "change", /*incChangeCounter*/ ctx[22], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*node*/ 4) && t0_value !== (t0_value = /*node*/ ctx[2].name + "")) set_data_dev(t0, t0_value);

    			if (!current || dirty[0] & /*vis*/ 32 && a_class_value !== (a_class_value = "name " + (/*vis*/ ctx[5] ? "opened" : "closed") + " svelte-ko15t2")) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (!current || dirty[0] & /*testResult*/ 8) span0.innerHTML = /*testResult*/ ctx[3];			if ((!current || dirty[0] & /*node*/ 4) && t4_value !== (t4_value = /*node*/ ctx[2].description + "")) set_data_dev(t4, t4_value);

    			if (/*node*/ ctx[2].args) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div3, t6);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty[0] & /*node*/ 4) && t8_value !== (t8_value = (/*node*/ ctx[2].type.kind == "LIST" ? "[...]" : "") + "")) set_data_dev(t8, t8_value);
    			const type_changes = {};
    			if (dirty[0] & /*node*/ 4) type_changes.typeName = /*node*/ ctx[2].type.name || /*node*/ ctx[2].type.ofType.name;
    			if (dirty[0] & /*scheme*/ 2) type_changes.scheme = /*scheme*/ ctx[1];
    			if (dirty[0] & /*parentid, node*/ 5) type_changes.parentid = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name);

    			if (!updating_getText && dirty[0] & /*getTypeText*/ 32768) {
    				updating_getText = true;
    				type_changes.getText = /*getTypeText*/ ctx[15];
    				add_flush_callback(() => updating_getText = false);
    			}

    			type.$set(type_changes);

    			if (!current || dirty[0] & /*parentid, node*/ 5 && textarea0_id_value !== (textarea0_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-query"))) {
    				attr_dev(textarea0, "id", textarea0_id_value);
    			}

    			if (!current || dirty[0] & /*request*/ 64) {
    				prop_dev(textarea0, "value", /*request*/ ctx[6]);
    			}

    			if (!current || dirty[0] & /*parentid, node*/ 5 && textarea1_id_value !== (textarea1_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-variables"))) {
    				attr_dev(textarea1, "id", textarea1_id_value);
    			}

    			if ((!current || dirty[0] & /*response*/ 128) && t26_value !== (t26_value = (/*response*/ ctx[7] ? "" : null) + "")) set_data_dev(t26, t26_value);

    			if (!current || dirty[0] & /*parentid, node*/ 5 && textarea2_id_value !== (textarea2_id_value = "" + (/*parentid*/ ctx[0] + "-" + /*node*/ ctx[2].name + "-eval-text"))) {
    				attr_dev(textarea2, "id", textarea2_id_value);
    			}

    			if (!current || dirty[0] & /*testResult*/ 8) span5.innerHTML = /*testResult*/ ctx[3];			if (!current || dirty[0] & /*evalErrors*/ 16) span6.innerHTML = /*evalErrors*/ ctx[4];
    			if (!current || dirty[0] & /*vis*/ 32) {
    				set_style(div23, "display", /*vis*/ ctx[5] ? "grid" : "none");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(type.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(type.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div24);
    			if (if_block) if_block.d();
    			destroy_component(type);
    			/*div3_binding*/ ctx[38](null);
    			/*textarea0_binding*/ ctx[39](null);
    			/*div5_binding*/ ctx[40](null);
    			/*textarea1_binding*/ ctx[41](null);
    			/*div8_binding*/ ctx[42](null);
    			/*form_1_binding*/ ctx[43](null);
    			/*div16_binding*/ ctx[44](null);
    			/*textarea2_binding*/ ctx[45](null);
    			/*div19_binding*/ ctx[46](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function onCodeMirrorChange(cm) {
    	var txt = cm.getDoc().getValue();
    	var textarea = cm.getTextArea();
    	textarea.value = txt;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $changeCount;
    	validate_store(changeCount, "changeCount");
    	component_subscribe($$self, changeCount, $$value => $$invalidate(31, $changeCount = $$value));
    	let { urlElement } = $$props;
    	let { credentialsElement } = $$props;
    	let { parentid = "" } = $$props;
    	let { scheme = {} } = $$props;
    	let { node = {} } = $$props;
    	let { operation = "" } = $$props;
    	let { test = submitForm } = $$props;
    	let testResult = "";
    	let evalErrors = "";
    	let vis = false;
    	let request;
    	let response = null;
    	let responseArea;
    	let evalTextarea;
    	let evalCodeMirror;
    	let variablesTextarea;
    	let variablesCodeMirror;
    	let queryTextarea;
    	let queryCodeMirror;
    	let queryFrame;
    	let variablesFrame;
    	let evalFrame;
    	let getTypeText;
    	let getArgFunctions = {};

    	function getArgsText() {
    		let args = [];

    		for (let [key, f] of Object.entries(getArgFunctions)) {
    			let text = f();
    			if (text) args.push(text);
    		}

    		let argsText = args.length == 0 ? "" : `(\n${args.join(",\n")}\n)`;
    		return argsText;
    	}

    	function generateQuery(el) {
    		console.log("generateQuery:", el);
    		let arglist = getArgsText();
    		let fieldlist = getTypeText ? getTypeText() : "";
    		$$invalidate(6, request = `${operation} {\n${node.name}${arglist}${fieldlist}\n}`);

    		if (queryCodeMirror) {
    			queryCodeMirror.getDoc().setValue(request);
    		}

    		incChangeCounter();
    	}

    	function submitForm(event) {
    		if (event) event.preventDefault();
    		console.log("submitForm credentialsElement=", credentialsElement.checked, " urlElement.value=", urlElement.value);

    		var ajaxOptions = {
    			url: urlElement.value,
    			type: "POST",
    			xhrFields: {
    				withCredentials: credentialsElement.checked
    			},
    			success(res) {
    				$$invalidate(7, response = res);
    				window.$(responseArea).jsonViewer(res, { collapsed: true, rootCollapsable: false });
    				evaluate();
    			}
    		};

    		window.$(form).ajaxSubmit(ajaxOptions);
    		return false;
    	}

    	function evaluate() {
    		$$invalidate(3, testResult = "");
    		$$invalidate(4, evalErrors = "");
    		let code = evalTextarea.value;
    		code = code.trimStart();
    		code = code.trimEnd();

    		if (code == "") {
    			$$invalidate(4, evalErrors = `<br>// Write code to evaluate server response.<br>// For example:<br>response.errors == null`);
    			return;
    		}

    		try {
    			let result = eval(code);
    			$$invalidate(3, testResult = result);
    		} catch(error) {
    			console.log(error);
    			$$invalidate(4, evalErrors = error);
    		}
    	}

    	function incChangeCounter(a) {
    		console.log("incChangeCounter", $changeCount, a);
    		set_store_value(changeCount, $changeCount += 1);
    	}

    	let jsOptions = {
    		mode: "javascript",
    		extraKeys: { "Ctrl-Space": "autocomplete" },
    		autoRefresh: true,
    		autoCloseBrackets: true,
    		matchBrackets: true,
    		tabSize: 2,
    		theme: "eclipse"
    	};

    	function addCodeMirrors() {
    		if (!evalCodeMirror) {
    			evalCodeMirror = CodeMirror.fromTextArea(evalTextarea, jsOptions);
    			evalCodeMirror.on("blur", incChangeCounter);
    			evalCodeMirror.on("change", onCodeMirrorChange);
    		}

    		if (!variablesCodeMirror) {
    			variablesCodeMirror = CodeMirror.fromTextArea(variablesTextarea, jsOptions);
    			variablesCodeMirror.on("blur", incChangeCounter);
    			variablesCodeMirror.on("change", onCodeMirrorChange);
    		}

    		if (!queryCodeMirror) {
    			queryCodeMirror = CodeMirror.fromTextArea(queryTextarea, jsOptions);
    			queryCodeMirror.on("blur", incChangeCounter);
    			queryCodeMirror.on("change", onCodeMirrorChange);
    		}
    	}

    	function removeCodeMirrors(params) {
    		if (evalCodeMirror) {
    			evalCodeMirror.off("blur", incChangeCounter);
    			evalCodeMirror.off("change", onCodeMirrorChange);
    			evalCodeMirror.toTextArea();
    			evalCodeMirror = null;
    		}

    		if (variablesCodeMirror) {
    			variablesCodeMirror.off("blur", incChangeCounter);
    			variablesCodeMirror.off("change", onCodeMirrorChange);
    			variablesCodeMirror.toTextArea();
    			variablesCodeMirror = null;
    		}

    		if (queryCodeMirror) {
    			queryCodeMirror.off("blur", incChangeCounter);
    			queryCodeMirror.off("change", onCodeMirrorChange);
    			queryCodeMirror.toTextArea();
    			queryCodeMirror = null;
    		}
    	}

    	function toggleVisibility(event) {
    		if (event) event.preventDefault();
    		$$invalidate(5, vis = !vis);

    		if (vis) {
    			addCodeMirrors();
    		} else {
    			removeCodeMirrors();
    		}
    	}

    	let form;
    	let formArea;

    	onMount(async () => {
    		window.$(formArea).resizable({ handles: "e" });
    		window.$(form).resizable({ handles: "e" });
    		window.$(queryFrame).resizable({ handles: "s" });
    		window.$(variablesFrame).resizable({ handles: "s" });
    		window.$(evalFrame).resizable({ handles: "s" });
    		console.log("on mount ----------------------------------------------");
    		generateQuery(node);
    	});

    	const writable_props = [
    		"urlElement",
    		"credentialsElement",
    		"parentid",
    		"scheme",
    		"node",
    		"operation",
    		"test"
    	];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Func> was created with unknown prop '${key}'`);
    	});

    	function argument_getText_binding(value, arg) {
    		getArgFunctions[arg.name] = value;
    		$$invalidate(16, getArgFunctions);
    	}

    	function type_getText_binding(value) {
    		getTypeText = value;
    		$$invalidate(15, getTypeText);
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(18, formArea = $$value);
    		});
    	}

    	function textarea0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(11, queryTextarea = $$value);
    		});
    	}

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(12, queryFrame = $$value);
    		});
    	}

    	function textarea1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(10, variablesTextarea = $$value);
    		});
    	}

    	function div8_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(13, variablesFrame = $$value);
    		});
    	}

    	function form_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(17, form = $$value);
    		});
    	}

    	function div16_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(8, responseArea = $$value);
    		});
    	}

    	function textarea2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(9, evalTextarea = $$value);
    		});
    	}

    	function div19_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(14, evalFrame = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("urlElement" in $$props) $$invalidate(24, urlElement = $$props.urlElement);
    		if ("credentialsElement" in $$props) $$invalidate(25, credentialsElement = $$props.credentialsElement);
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("scheme" in $$props) $$invalidate(1, scheme = $$props.scheme);
    		if ("node" in $$props) $$invalidate(2, node = $$props.node);
    		if ("operation" in $$props) $$invalidate(26, operation = $$props.operation);
    		if ("test" in $$props) $$invalidate(27, test = $$props.test);
    	};

    	$$self.$capture_state = () => {
    		return {
    			urlElement,
    			credentialsElement,
    			parentid,
    			scheme,
    			node,
    			operation,
    			test,
    			testResult,
    			evalErrors,
    			vis,
    			request,
    			response,
    			responseArea,
    			evalTextarea,
    			evalCodeMirror,
    			variablesTextarea,
    			variablesCodeMirror,
    			queryTextarea,
    			queryCodeMirror,
    			queryFrame,
    			variablesFrame,
    			evalFrame,
    			getTypeText,
    			getArgFunctions,
    			jsOptions,
    			form,
    			formArea,
    			$changeCount
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("urlElement" in $$props) $$invalidate(24, urlElement = $$props.urlElement);
    		if ("credentialsElement" in $$props) $$invalidate(25, credentialsElement = $$props.credentialsElement);
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("scheme" in $$props) $$invalidate(1, scheme = $$props.scheme);
    		if ("node" in $$props) $$invalidate(2, node = $$props.node);
    		if ("operation" in $$props) $$invalidate(26, operation = $$props.operation);
    		if ("test" in $$props) $$invalidate(27, test = $$props.test);
    		if ("testResult" in $$props) $$invalidate(3, testResult = $$props.testResult);
    		if ("evalErrors" in $$props) $$invalidate(4, evalErrors = $$props.evalErrors);
    		if ("vis" in $$props) $$invalidate(5, vis = $$props.vis);
    		if ("request" in $$props) $$invalidate(6, request = $$props.request);
    		if ("response" in $$props) $$invalidate(7, response = $$props.response);
    		if ("responseArea" in $$props) $$invalidate(8, responseArea = $$props.responseArea);
    		if ("evalTextarea" in $$props) $$invalidate(9, evalTextarea = $$props.evalTextarea);
    		if ("evalCodeMirror" in $$props) evalCodeMirror = $$props.evalCodeMirror;
    		if ("variablesTextarea" in $$props) $$invalidate(10, variablesTextarea = $$props.variablesTextarea);
    		if ("variablesCodeMirror" in $$props) variablesCodeMirror = $$props.variablesCodeMirror;
    		if ("queryTextarea" in $$props) $$invalidate(11, queryTextarea = $$props.queryTextarea);
    		if ("queryCodeMirror" in $$props) queryCodeMirror = $$props.queryCodeMirror;
    		if ("queryFrame" in $$props) $$invalidate(12, queryFrame = $$props.queryFrame);
    		if ("variablesFrame" in $$props) $$invalidate(13, variablesFrame = $$props.variablesFrame);
    		if ("evalFrame" in $$props) $$invalidate(14, evalFrame = $$props.evalFrame);
    		if ("getTypeText" in $$props) $$invalidate(15, getTypeText = $$props.getTypeText);
    		if ("getArgFunctions" in $$props) $$invalidate(16, getArgFunctions = $$props.getArgFunctions);
    		if ("jsOptions" in $$props) jsOptions = $$props.jsOptions;
    		if ("form" in $$props) $$invalidate(17, form = $$props.form);
    		if ("formArea" in $$props) $$invalidate(18, formArea = $$props.formArea);
    		if ("$changeCount" in $$props) changeCount.set($changeCount = $$props.$changeCount);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*node*/ 4) {
    			 {
    				console.log("node changed -------------");
    			}
    		}
    	};

    	return [
    		parentid,
    		scheme,
    		node,
    		testResult,
    		evalErrors,
    		vis,
    		request,
    		response,
    		responseArea,
    		evalTextarea,
    		variablesTextarea,
    		queryTextarea,
    		queryFrame,
    		variablesFrame,
    		evalFrame,
    		getTypeText,
    		getArgFunctions,
    		form,
    		formArea,
    		generateQuery,
    		submitForm,
    		evaluate,
    		incChangeCounter,
    		toggleVisibility,
    		urlElement,
    		credentialsElement,
    		operation,
    		test,
    		evalCodeMirror,
    		variablesCodeMirror,
    		queryCodeMirror,
    		$changeCount,
    		getArgsText,
    		jsOptions,
    		addCodeMirrors,
    		removeCodeMirrors,
    		argument_getText_binding,
    		type_getText_binding,
    		div3_binding,
    		textarea0_binding,
    		div5_binding,
    		textarea1_binding,
    		div8_binding,
    		form_1_binding,
    		div16_binding,
    		textarea2_binding,
    		div19_binding
    	];
    }

    class Func extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{
    				urlElement: 24,
    				credentialsElement: 25,
    				parentid: 0,
    				scheme: 1,
    				node: 2,
    				operation: 26,
    				test: 27
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Func",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*urlElement*/ ctx[24] === undefined && !("urlElement" in props)) {
    			console_1$1.warn("<Func> was created without expected prop 'urlElement'");
    		}

    		if (/*credentialsElement*/ ctx[25] === undefined && !("credentialsElement" in props)) {
    			console_1$1.warn("<Func> was created without expected prop 'credentialsElement'");
    		}
    	}

    	get urlElement() {
    		throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set urlElement(value) {
    		throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get credentialsElement() {
    		throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set credentialsElement(value) {
    		throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parentid() {
    		throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentid(value) {
    		throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scheme() {
    		throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scheme(value) {
    		throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get node() {
    		throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set node(value) {
    		throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get operation() {
    		throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set operation(value) {
    		throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get test() {
    		throw new Error("<Func>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set test(value) {
    		throw new Error("<Func>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/List.svelte generated by Svelte v3.17.1 */

    const { Object: Object_1$2 } = globals;
    const file$6 = "src/List.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (62:5) {#each queries as e (e.name)}
    function create_each_block_2(key_1, ctx) {
    	let div;
    	let updating_test;
    	let current;

    	function func_test_binding(value) {
    		/*func_test_binding*/ ctx[11].call(null, value, /*e*/ ctx[16]);
    	}

    	let func_props = {
    		credentialsElement: /*credentialsElement*/ ctx[2],
    		urlElement: /*urlElement*/ ctx[1],
    		node: /*e*/ ctx[16],
    		operation: "query",
    		scheme: /*scheme*/ ctx[0],
    		parentid: "" + (/*parentid*/ ctx[3] + "-query")
    	};

    	if (/*testFunctions*/ ctx[8][/*e*/ ctx[16].name] !== void 0) {
    		func_props.test = /*testFunctions*/ ctx[8][/*e*/ ctx[16].name];
    	}

    	const func = new Func({ props: func_props, $$inline: true });
    	binding_callbacks.push(() => bind(func, "test", func_test_binding));

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			create_component(func.$$.fragment);
    			add_location(div, file$6, 62, 10, 1304);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(func, div, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const func_changes = {};
    			if (dirty & /*credentialsElement*/ 4) func_changes.credentialsElement = /*credentialsElement*/ ctx[2];
    			if (dirty & /*urlElement*/ 2) func_changes.urlElement = /*urlElement*/ ctx[1];
    			if (dirty & /*queries*/ 32) func_changes.node = /*e*/ ctx[16];
    			if (dirty & /*scheme*/ 1) func_changes.scheme = /*scheme*/ ctx[0];
    			if (dirty & /*parentid*/ 8) func_changes.parentid = "" + (/*parentid*/ ctx[3] + "-query");

    			if (!updating_test && dirty & /*testFunctions, queries*/ 288) {
    				updating_test = true;
    				func_changes.test = /*testFunctions*/ ctx[8][/*e*/ ctx[16].name];
    				add_flush_callback(() => updating_test = false);
    			}

    			func.$set(func_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(func.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(func.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(func);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(62:5) {#each queries as e (e.name)}",
    		ctx
    	});

    	return block;
    }

    // (72:5) {#each mutations as e (e.name)}
    function create_each_block_1(key_1, ctx) {
    	let div;
    	let updating_test;
    	let current;

    	function func_test_binding_1(value) {
    		/*func_test_binding_1*/ ctx[12].call(null, value, /*e*/ ctx[16]);
    	}

    	let func_props = {
    		credentialsElement: /*credentialsElement*/ ctx[2],
    		urlElement: /*urlElement*/ ctx[1],
    		node: /*e*/ ctx[16],
    		operation: "mutation",
    		scheme: /*scheme*/ ctx[0],
    		parentid: "" + (/*parentid*/ ctx[3] + "-mutation")
    	};

    	if (/*testFunctions*/ ctx[8][/*e*/ ctx[16].name] !== void 0) {
    		func_props.test = /*testFunctions*/ ctx[8][/*e*/ ctx[16].name];
    	}

    	const func = new Func({ props: func_props, $$inline: true });
    	binding_callbacks.push(() => bind(func, "test", func_test_binding_1));

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			create_component(func.$$.fragment);
    			add_location(div, file$6, 72, 10, 1697);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(func, div, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const func_changes = {};
    			if (dirty & /*credentialsElement*/ 4) func_changes.credentialsElement = /*credentialsElement*/ ctx[2];
    			if (dirty & /*urlElement*/ 2) func_changes.urlElement = /*urlElement*/ ctx[1];
    			if (dirty & /*mutations*/ 16) func_changes.node = /*e*/ ctx[16];
    			if (dirty & /*scheme*/ 1) func_changes.scheme = /*scheme*/ ctx[0];
    			if (dirty & /*parentid*/ 8) func_changes.parentid = "" + (/*parentid*/ ctx[3] + "-mutation");

    			if (!updating_test && dirty & /*testFunctions, mutations*/ 272) {
    				updating_test = true;
    				func_changes.test = /*testFunctions*/ ctx[8][/*e*/ ctx[16].name];
    				add_flush_callback(() => updating_test = false);
    			}

    			func.$set(func_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(func.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(func.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(func);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(72:5) {#each mutations as e (e.name)}",
    		ctx
    	});

    	return block;
    }

    // (82:5) {#each usertypes as t}
    function create_each_block$2(ctx) {
    	let div;
    	let t;
    	let current;

    	const type = new Type({
    			props: {
    				showCheckbox: false,
    				typeName: /*t*/ ctx[13].name,
    				scheme: /*scheme*/ ctx[0],
    				parentid: "" + (/*parentid*/ ctx[3] + "-usertypes")
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(type.$$.fragment);
    			t = space();
    			add_location(div, file$6, 82, 10, 2088);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(type, div, null);
    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const type_changes = {};
    			if (dirty & /*usertypes*/ 64) type_changes.typeName = /*t*/ ctx[13].name;
    			if (dirty & /*scheme*/ 1) type_changes.scheme = /*scheme*/ ctx[0];
    			if (dirty & /*parentid*/ 8) type_changes.parentid = "" + (/*parentid*/ ctx[3] + "-usertypes");
    			type.$set(type_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(type.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(type.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(type);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(82:5) {#each usertypes as t}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let h40;
    	let t1;
    	let each_blocks_2 = [];
    	let each0_lookup = new Map();
    	let t2;
    	let h41;
    	let t4;
    	let each_blocks_1 = [];
    	let each1_lookup = new Map();
    	let t5;
    	let h42;
    	let t7;
    	let current;
    	let each_value_2 = /*queries*/ ctx[5];
    	const get_key = ctx => /*e*/ ctx[16].name;

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
    	}

    	let each_value_1 = /*mutations*/ ctx[4];
    	const get_key_1 = ctx => /*e*/ ctx[16].name;

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = /*usertypes*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			h40 = element("h4");
    			h40.textContent = "Queries";
    			t1 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t2 = space();
    			h41 = element("h4");
    			h41.textContent = "Mutations";
    			t4 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			h42 = element("h4");
    			h42.textContent = "User types";
    			t7 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h40, file$6, 60, 5, 1242);
    			add_location(h41, file$6, 70, 5, 1631);
    			add_location(h42, file$6, 80, 5, 2030);
    			attr_dev(div, "class", "svelte-12z8bpo");
    			toggle_class(div, "noscheme", /*noscheme*/ ctx[7]);
    			add_location(div, file$6, 58, 0, 1148);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h40);
    			append_dev(div, t1);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div, null);
    			}

    			append_dev(div, t2);
    			append_dev(div, h41);
    			append_dev(div, t4);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div, null);
    			}

    			append_dev(div, t5);
    			append_dev(div, h42);
    			append_dev(div, t7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const each_value_2 = /*queries*/ ctx[5];
    			group_outros();
    			each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_2, each0_lookup, div, outro_and_destroy_block, create_each_block_2, t2, get_each_context_2);
    			check_outros();
    			const each_value_1 = /*mutations*/ ctx[4];
    			group_outros();
    			each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_1, each1_lookup, div, outro_and_destroy_block, create_each_block_1, t5, get_each_context_1);
    			check_outros();

    			if (dirty & /*usertypes, scheme, parentid*/ 73) {
    				each_value = /*usertypes*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*noscheme*/ 128) {
    				toggle_class(div, "noscheme", /*noscheme*/ ctx[7]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d();
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function compareTypes(t1, t2) {
    	if (t1.name > t2.name) {
    		return 1;
    	} else if (t1.name < t2.name) {
    		return -1;
    	}

    	return 0;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { scheme } = $$props;
    	let { urlElement } = $$props;
    	let { credentialsElement } = $$props;
    	let { parentid = "" } = $$props;

    	let { doTests = function () {
    		for (let [key, f] of Object.entries(testFunctions)) f();
    	} } = $$props;

    	let mutations = [];
    	let queries = [];
    	let types = [];
    	let usertypes = [];
    	let noscheme = true;
    	let testFunctions = {};
    	const writable_props = ["scheme", "urlElement", "credentialsElement", "parentid", "doTests"];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	function func_test_binding(value, e) {
    		testFunctions[e.name] = value;
    		$$invalidate(8, testFunctions);
    	}

    	function func_test_binding_1(value, e) {
    		testFunctions[e.name] = value;
    		$$invalidate(8, testFunctions);
    	}

    	$$self.$set = $$props => {
    		if ("scheme" in $$props) $$invalidate(0, scheme = $$props.scheme);
    		if ("urlElement" in $$props) $$invalidate(1, urlElement = $$props.urlElement);
    		if ("credentialsElement" in $$props) $$invalidate(2, credentialsElement = $$props.credentialsElement);
    		if ("parentid" in $$props) $$invalidate(3, parentid = $$props.parentid);
    		if ("doTests" in $$props) $$invalidate(9, doTests = $$props.doTests);
    	};

    	$$self.$capture_state = () => {
    		return {
    			scheme,
    			urlElement,
    			credentialsElement,
    			parentid,
    			doTests,
    			mutations,
    			queries,
    			types,
    			usertypes,
    			noscheme,
    			testFunctions
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("scheme" in $$props) $$invalidate(0, scheme = $$props.scheme);
    		if ("urlElement" in $$props) $$invalidate(1, urlElement = $$props.urlElement);
    		if ("credentialsElement" in $$props) $$invalidate(2, credentialsElement = $$props.credentialsElement);
    		if ("parentid" in $$props) $$invalidate(3, parentid = $$props.parentid);
    		if ("doTests" in $$props) $$invalidate(9, doTests = $$props.doTests);
    		if ("mutations" in $$props) $$invalidate(4, mutations = $$props.mutations);
    		if ("queries" in $$props) $$invalidate(5, queries = $$props.queries);
    		if ("types" in $$props) types = $$props.types;
    		if ("usertypes" in $$props) $$invalidate(6, usertypes = $$props.usertypes);
    		if ("noscheme" in $$props) $$invalidate(7, noscheme = $$props.noscheme);
    		if ("testFunctions" in $$props) $$invalidate(8, testFunctions = $$props.testFunctions);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scheme*/ 1) {
    			 {
    				$$invalidate(4, mutations = []);
    				$$invalidate(5, queries = []);
    				types = [];
    				$$invalidate(6, usertypes = []);

    				try {
    					$$invalidate(7, noscheme = Object.entries(scheme).length == 0);
    					$$invalidate(4, mutations = scheme.data.__schema.mutationType.fields);
    					$$invalidate(5, queries = scheme.data.__schema.queryType.fields);
    					types = scheme.data.__schema.types.sort(compareTypes);
    					$$invalidate(6, usertypes = scheme.data.__schema.types.filter(t => t.name[0] != "_" && t.kind == "OBJECT" && t.name != "Query" && t.name != "Mutation").sort(compareTypes));
    				} catch(e) {
    					
    				}
    			}
    		}
    	};

    	return [
    		scheme,
    		urlElement,
    		credentialsElement,
    		parentid,
    		mutations,
    		queries,
    		usertypes,
    		noscheme,
    		testFunctions,
    		doTests,
    		types,
    		func_test_binding,
    		func_test_binding_1
    	];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			scheme: 0,
    			urlElement: 1,
    			credentialsElement: 2,
    			parentid: 3,
    			doTests: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*scheme*/ ctx[0] === undefined && !("scheme" in props)) {
    			console.warn("<List> was created without expected prop 'scheme'");
    		}

    		if (/*urlElement*/ ctx[1] === undefined && !("urlElement" in props)) {
    			console.warn("<List> was created without expected prop 'urlElement'");
    		}

    		if (/*credentialsElement*/ ctx[2] === undefined && !("credentialsElement" in props)) {
    			console.warn("<List> was created without expected prop 'credentialsElement'");
    		}
    	}

    	get scheme() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scheme(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get urlElement() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set urlElement(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get credentialsElement() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set credentialsElement(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parentid() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentid(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get doTests() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set doTests(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.17.1 */

    const { console: console_1$2 } = globals;
    const file$7 = "src/App.svelte";

    function create_fragment$7(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let updating_credentialsElement;
    	let updating_urlElement;
    	let updating_scheme;
    	let t2;
    	let input;
    	let t3;
    	let div2;
    	let updating_doTests;
    	let current;
    	let dispose;

    	function schemer_credentialsElement_binding(value) {
    		/*schemer_credentialsElement_binding*/ ctx[19].call(null, value);
    	}

    	function schemer_urlElement_binding(value_1) {
    		/*schemer_urlElement_binding*/ ctx[20].call(null, value_1);
    	}

    	function schemer_scheme_binding(value_2) {
    		/*schemer_scheme_binding*/ ctx[21].call(null, value_2);
    	}

    	let schemer_props = {
    		parentid: "" + (/*parentid*/ ctx[0] + "-Schemer")
    	};

    	if (/*credentialsElement*/ ctx[3] !== void 0) {
    		schemer_props.credentialsElement = /*credentialsElement*/ ctx[3];
    	}

    	if (/*urlElement*/ ctx[2] !== void 0) {
    		schemer_props.urlElement = /*urlElement*/ ctx[2];
    	}

    	if (/*scheme*/ ctx[5] !== void 0) {
    		schemer_props.scheme = /*scheme*/ ctx[5];
    	}

    	const schemer = new Schemer({ props: schemer_props, $$inline: true });
    	/*schemer_binding*/ ctx[18](schemer);
    	binding_callbacks.push(() => bind(schemer, "credentialsElement", schemer_credentialsElement_binding));
    	binding_callbacks.push(() => bind(schemer, "urlElement", schemer_urlElement_binding));
    	binding_callbacks.push(() => bind(schemer, "scheme", schemer_scheme_binding));
    	schemer.$on("clear", /*clearStorageItemScheme*/ ctx[9]);

    	function list_doTests_binding(value_3) {
    		/*list_doTests_binding*/ ctx[22].call(null, value_3);
    	}

    	let list_props = {
    		parentid: "" + (/*parentid*/ ctx[0] + "-List"),
    		credentialsElement: /*credentialsElement*/ ctx[3],
    		urlElement: /*urlElement*/ ctx[2],
    		scheme: /*scheme*/ ctx[5]
    	};

    	if (/*doTests*/ ctx[6] !== void 0) {
    		list_props.doTests = /*doTests*/ ctx[6];
    	}

    	const list = new List({ props: list_props, $$inline: true });
    	binding_callbacks.push(() => bind(list, "doTests", list_doTests_binding));

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "GraphQL endpoint";
    			t1 = space();
    			div1 = element("div");
    			create_component(schemer.$$.fragment);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			div2 = element("div");
    			create_component(list.$$.fragment);
    			attr_dev(div0, "class", "smaller svelte-xun2ts");
    			add_location(div0, file$7, 180, 8, 4092);
    			attr_dev(input, "type", "button");
    			attr_dev(input, "class", "button svelte-xun2ts");
    			input.value = "run all tests";
    			add_location(input, file$7, 183, 12, 4385);
    			attr_dev(div1, "class", "row svelte-xun2ts");
    			add_location(div1, file$7, 181, 8, 4144);
    			attr_dev(div2, "class", "main");
    			add_location(div2, file$7, 185, 8, 4490);
    			attr_dev(div3, "class", "root svelte-xun2ts");
    			add_location(div3, file$7, 179, 4, 4064);
    			attr_dev(div4, "class", "hidden svelte-xun2ts");
    			toggle_class(div4, "visible", /*visible*/ ctx[1]);
    			add_location(div4, file$7, 178, 0, 4025);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			mount_component(schemer, div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, input);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			mount_component(list, div2, null);
    			/*div2_binding*/ ctx[23](div2);
    			current = true;
    			dispose = listen_dev(input, "click", /*doAllTests*/ ctx[8], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			const schemer_changes = {};
    			if (dirty & /*parentid*/ 1) schemer_changes.parentid = "" + (/*parentid*/ ctx[0] + "-Schemer");

    			if (!updating_credentialsElement && dirty & /*credentialsElement*/ 8) {
    				updating_credentialsElement = true;
    				schemer_changes.credentialsElement = /*credentialsElement*/ ctx[3];
    				add_flush_callback(() => updating_credentialsElement = false);
    			}

    			if (!updating_urlElement && dirty & /*urlElement*/ 4) {
    				updating_urlElement = true;
    				schemer_changes.urlElement = /*urlElement*/ ctx[2];
    				add_flush_callback(() => updating_urlElement = false);
    			}

    			if (!updating_scheme && dirty & /*scheme*/ 32) {
    				updating_scheme = true;
    				schemer_changes.scheme = /*scheme*/ ctx[5];
    				add_flush_callback(() => updating_scheme = false);
    			}

    			schemer.$set(schemer_changes);
    			const list_changes = {};
    			if (dirty & /*parentid*/ 1) list_changes.parentid = "" + (/*parentid*/ ctx[0] + "-List");
    			if (dirty & /*credentialsElement*/ 8) list_changes.credentialsElement = /*credentialsElement*/ ctx[3];
    			if (dirty & /*urlElement*/ 4) list_changes.urlElement = /*urlElement*/ ctx[2];
    			if (dirty & /*scheme*/ 32) list_changes.scheme = /*scheme*/ ctx[5];

    			if (!updating_doTests && dirty & /*doTests*/ 64) {
    				updating_doTests = true;
    				list_changes.doTests = /*doTests*/ ctx[6];
    				add_flush_callback(() => updating_doTests = false);
    			}

    			list.$set(list_changes);

    			if (dirty & /*visible*/ 2) {
    				toggle_class(div4, "visible", /*visible*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(schemer.$$.fragment, local);
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(schemer.$$.fragment, local);
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			/*schemer_binding*/ ctx[18](null);
    			destroy_component(schemer);
    			destroy_component(list);
    			/*div2_binding*/ ctx[23](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { parentid = "tab1" } = $$props;
    	let { visible = true } = $$props;
    	let { url = "" } = $$props;
    	let urlElement;
    	let credentialsElement;
    	let schemerElement;
    	let scheme = {};
    	let doTests;
    	let mainArea;
    	let controls;

    	function doAllTests() {
    		doTests();
    	}

    	function getControlValuesByTagName(tag) {
    		let a = [];

    		if (!mainArea) {
    			return a;
    		}

    		let inps = mainArea.getElementsByTagName(tag);

    		for (let inp of inps) {
    			let id = inp.getAttribute("id");
    			if (!id) continue;
    			if (id[0] == "-") console.log(id);

    			let type = tag == "textarea"
    			? "textarea"
    			: inp.getAttribute("type");

    			let value = inp.value;
    			let checked = inp.checked;
    			a.push({ id, type, checked, value });
    		}

    		return a;
    	}

    	function getControlValues() {
    		let inputs = getControlValuesByTagName("input");
    		let textareas = getControlValuesByTagName("textarea");
    		return inputs.concat(textareas);
    	}

    	function restoreControlValues() {
    		if (!controls) return;
    		let restored = 0;

    		for (let c of controls) {
    			let inp = document.getElementById(c.id);

    			if (!inp) {
    				console.log("No input with id:", c.id);
    				continue;
    			}

    			restored++;

    			if (c.type == "checkbox") {
    				inp.checked = c.checked;
    			} else {
    				inp.value = c.value;
    			}
    		}

    		console.log(restored, "condrols have been restored.");
    	}

    	function clearStorageItemScheme() {
    		localStorage.removeItem(parentid);
    		console.log("App: clearStorageItemScheme: ", parentid);
    	}

    	function reloadSchema() {
    		schemerElement.getSchema();
    	}

    	function saveInputs() {
    		let key = parentid;
    		let controls = getControlValues();

    		let value = {
    			url: urlElement.value,
    			credentials: credentialsElement.checked,
    			controls,
    			scheme
    		};

    		let controlsStr = JSON.stringify(value);
    		localStorage.setItem(key, controlsStr);
    		console.log("saved tab:", key, "controlsStr.length=", controlsStr.length, value);
    	}

    	function restoreInputs(tabName) {
    		let controlsStr = localStorage.getItem(tabName);
    		if (!controlsStr) return;
    		let value = JSON.parse(controlsStr);
    		$$invalidate(2, urlElement.value = value.url, urlElement);
    		$$invalidate(3, credentialsElement.checked = value.credentials, credentialsElement);
    		$$invalidate(5, scheme = value.scheme);
    		console.log("restored tab:", tabName, "controlsStr.length=", controlsStr.length, value);
    		controls = value.controls;
    	}

    	const writable_props = ["parentid", "visible", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function schemer_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, schemerElement = $$value);
    		});
    	}

    	function schemer_credentialsElement_binding(value) {
    		credentialsElement = value;
    		$$invalidate(3, credentialsElement);
    	}

    	function schemer_urlElement_binding(value_1) {
    		urlElement = value_1;
    		($$invalidate(2, urlElement), $$invalidate(10, url));
    	}

    	function schemer_scheme_binding(value_2) {
    		scheme = value_2;
    		$$invalidate(5, scheme);
    	}

    	function list_doTests_binding(value_3) {
    		doTests = value_3;
    		$$invalidate(6, doTests);
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(7, mainArea = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    		if ("url" in $$props) $$invalidate(10, url = $$props.url);
    	};

    	$$self.$capture_state = () => {
    		return {
    			parentid,
    			visible,
    			url,
    			urlElement,
    			credentialsElement,
    			schemerElement,
    			scheme,
    			doTests,
    			mainArea,
    			controls
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("parentid" in $$props) $$invalidate(0, parentid = $$props.parentid);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    		if ("url" in $$props) $$invalidate(10, url = $$props.url);
    		if ("urlElement" in $$props) $$invalidate(2, urlElement = $$props.urlElement);
    		if ("credentialsElement" in $$props) $$invalidate(3, credentialsElement = $$props.credentialsElement);
    		if ("schemerElement" in $$props) $$invalidate(4, schemerElement = $$props.schemerElement);
    		if ("scheme" in $$props) $$invalidate(5, scheme = $$props.scheme);
    		if ("doTests" in $$props) $$invalidate(6, doTests = $$props.doTests);
    		if ("mainArea" in $$props) $$invalidate(7, mainArea = $$props.mainArea);
    		if ("controls" in $$props) controls = $$props.controls;
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*urlElement, url*/ 1028) {
    			 if (urlElement) $$invalidate(2, urlElement.value = url, urlElement);
    		}
    	};

    	return [
    		parentid,
    		visible,
    		urlElement,
    		credentialsElement,
    		schemerElement,
    		scheme,
    		doTests,
    		mainArea,
    		doAllTests,
    		clearStorageItemScheme,
    		url,
    		reloadSchema,
    		saveInputs,
    		restoreInputs,
    		controls,
    		getControlValuesByTagName,
    		getControlValues,
    		restoreControlValues,
    		schemer_binding,
    		schemer_credentialsElement_binding,
    		schemer_urlElement_binding,
    		schemer_scheme_binding,
    		list_doTests_binding,
    		div2_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			parentid: 0,
    			visible: 1,
    			url: 10,
    			reloadSchema: 11,
    			saveInputs: 12,
    			restoreInputs: 13
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get parentid() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentid(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visible() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reloadSchema() {
    		return this.$$.ctx[11];
    	}

    	set reloadSchema(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get saveInputs() {
    		return this.$$.ctx[12];
    	}

    	set saveInputs(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreInputs() {
    		return this.$$.ctx[13];
    	}

    	set restoreInputs(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Tabs.svelte generated by Svelte v3.17.1 */

    const { Object: Object_1$3 } = globals;
    const file$8 = "src/Tabs.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (291:4) {#each tabs as tab (tab.tabName)}
    function create_each_block$3(key_1, ctx) {
    	let span1;
    	let t0_value = /*tab*/ ctx[13].tabName + "";
    	let t0;
    	let t1;
    	let span0;
    	let t2;
    	let span0_title_value;
    	let span0_data_tabname_value;
    	let t3;
    	let div;
    	let input0;
    	let input0_title_value;
    	let t4;
    	let input1;
    	let input1_title_value;
    	let span1_data_tabname_value;
    	let dispose;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			span1 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span0 = element("span");
    			t2 = text("×");
    			t3 = space();
    			div = element("div");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			attr_dev(span0, "class", "x svelte-m7qdnd");
    			attr_dev(span0, "title", span0_title_value = "delete " + /*tab*/ ctx[13].tabName + " tab");
    			attr_dev(span0, "data-tabname", span0_data_tabname_value = /*tab*/ ctx[13].tabName);
    			add_location(span0, file$8, 292, 12, 6997);
    			attr_dev(input0, "type", "button");
    			attr_dev(input0, "class", "button-tiny svelte-m7qdnd");
    			attr_dev(input0, "title", input0_title_value = "Rename " + /*active*/ ctx[1].tabName + " tab");
    			input0.value = "rename";
    			add_location(input0, file$8, 294, 16, 7158);
    			attr_dev(input1, "type", "button");
    			attr_dev(input1, "class", "button-tiny svelte-m7qdnd");
    			attr_dev(input1, "title", input1_title_value = "Save " + /*active*/ ctx[1].tabName + " to a file");
    			input1.value = "export";
    			add_location(input1, file$8, 295, 16, 7288);
    			attr_dev(div, "class", "tabmenu svelte-m7qdnd");
    			add_location(div, file$8, 293, 12, 7120);
    			attr_dev(span1, "class", "tab svelte-m7qdnd");
    			attr_dev(span1, "data-tabname", span1_data_tabname_value = /*tab*/ ctx[13].tabName);
    			toggle_class(span1, "active", /*tab*/ ctx[13].tabName == /*active*/ ctx[1].tabName);
    			add_location(span1, file$8, 291, 8, 6860);
    			this.first = span1;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t0);
    			append_dev(span1, t1);
    			append_dev(span1, span0);
    			append_dev(span0, t2);
    			append_dev(span1, t3);
    			append_dev(span1, div);
    			append_dev(div, input0);
    			append_dev(div, t4);
    			append_dev(div, input1);

    			dispose = [
    				listen_dev(span0, "click", /*deleteTab*/ ctx[4], false, false, false),
    				listen_dev(input0, "click", /*renameTab*/ ctx[7], false, false, false),
    				listen_dev(input1, "click", /*exportTab*/ ctx[5], false, false, false),
    				listen_dev(span1, "click", /*activate*/ ctx[2], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tabs*/ 1 && t0_value !== (t0_value = /*tab*/ ctx[13].tabName + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*tabs*/ 1 && span0_title_value !== (span0_title_value = "delete " + /*tab*/ ctx[13].tabName + " tab")) {
    				attr_dev(span0, "title", span0_title_value);
    			}

    			if (dirty & /*tabs*/ 1 && span0_data_tabname_value !== (span0_data_tabname_value = /*tab*/ ctx[13].tabName)) {
    				attr_dev(span0, "data-tabname", span0_data_tabname_value);
    			}

    			if (dirty & /*active*/ 2 && input0_title_value !== (input0_title_value = "Rename " + /*active*/ ctx[1].tabName + " tab")) {
    				attr_dev(input0, "title", input0_title_value);
    			}

    			if (dirty & /*active*/ 2 && input1_title_value !== (input1_title_value = "Save " + /*active*/ ctx[1].tabName + " to a file")) {
    				attr_dev(input1, "title", input1_title_value);
    			}

    			if (dirty & /*tabs*/ 1 && span1_data_tabname_value !== (span1_data_tabname_value = /*tab*/ ctx[13].tabName)) {
    				attr_dev(span1, "data-tabname", span1_data_tabname_value);
    			}

    			if (dirty & /*tabs, active*/ 3) {
    				toggle_class(span1, "active", /*tab*/ ctx[13].tabName == /*active*/ ctx[1].tabName);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(291:4) {#each tabs as tab (tab.tabName)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let input;
    	let dispose;
    	let each_value = /*tabs*/ ctx[0];
    	const get_key = ctx => /*tab*/ ctx[13].tabName;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "    ＋    ";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "import";
    			t4 = space();
    			input = element("input");
    			attr_dev(span0, "title", "Add a new tab");
    			attr_dev(span0, "class", "button-tiny svelte-m7qdnd");
    			set_style(span0, "font-weight", "bold");
    			add_location(span0, file$8, 301, 4, 7491);
    			attr_dev(span1, "title", "Import tab from a file");
    			attr_dev(span1, "class", "button-tiny svelte-m7qdnd");
    			add_location(span1, file$8, 302, 4, 7641);
    			attr_dev(input, "id", "fileChooser");
    			attr_dev(input, "type", "file");
    			set_style(input, "display", "none");
    			add_location(input, file$8, 304, 4, 7758);
    			attr_dev(div, "class", "container svelte-m7qdnd");
    			add_location(div, file$8, 288, 0, 6789);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t0);
    			append_dev(div, span0);
    			append_dev(div, t2);
    			append_dev(div, span1);
    			append_dev(div, t4);
    			append_dev(div, input);

    			dispose = [
    				listen_dev(span0, "click", /*addTab*/ ctx[3], false, false, false),
    				listen_dev(span1, "click", importTab, false, false, false),
    				listen_dev(input, "change", /*openFile*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			const each_value = /*tabs*/ ctx[0];
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block$3, t0, get_each_context$3);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getTabsFromLocalStorage() {
    	let tabs = [];
    	let keys = Object.keys(localStorage);
    	keys.sort();

    	for (let key of keys) {
    		let str = localStorage.getItem(key);
    		if (!str) continue;
    		let value = JSON.parse(str);

    		tabs.push({
    			tabName: key,
    			url: (" " + value.url).slice(1),
    			scheme: value.scheme
    		});
    	}

    	return tabs;
    }

    function fixLocalStorageData(controlsStr, tabName, newTabName) {
    	if (!controlsStr) return controlsStr;
    	let val = JSON.parse(controlsStr);
    	if (!val) return controlsStr;
    	if (!val.controls) return controlsStr;

    	for (let c of val.controls) {
    		c.id = c.id.replace(tabName, newTabName);
    	}

    	return JSON.stringify(val);
    }

    function importTab() {
    	document.getElementById("fileChooser").click();
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { tabs = [] } = $$props;
    	let { active } = $$props;
    	const dispatch = createEventDispatcher();

    	function activate(e) {
    		let tabName = this.getAttribute("data-tabName");
    		$$invalidate(1, active = tabs.find(t => t.tabName == tabName));
    		dispatch("activate", tabName);
    	}

    	function addNewTab(tabName, url) {
    		let newTab = { tabName, url };
    		$$invalidate(0, tabs = [...tabs, newTab]);
    		$$invalidate(1, active = newTab);
    		dispatch("newtab", tabName);
    	}

    	function addTab() {
    		let tabName = prompt("Enter a new tab name", "new");
    		if (!tabName) return;

    		while (tabs.some(tab => tabName == tab.tabName)) {
    			tabName = prompt(`"${tabName}" already exists. Please try again.`, tabName);
    			if (!tabName) return;
    		}

    		addNewTab(tabName, "");
    	}

    	function setActiveTabByName(name) {
    		let ind = tabs.findIndex(t => t.tabName == name);

    		if (ind == -1) {
    			return;
    		}

    		$$invalidate(1, active = tabs[ind]);
    	}

    	function deleteTabByName(tabName) {
    		let tabData = localStorage.getItem(tabName);
    		localStorage.removeItem(tabName);
    		$$invalidate(0, tabs = tabs.filter(t => t.tabName != tabName));
    		$$invalidate(1, active = tabs.length > 0 ? tabs[0] : null);
    		return tabData;
    	}

    	function deleteTab() {
    		let tabName = this.getAttribute("data-tabName");
    		deleteTabByName(tabName);
    	}

    	function exportTab() {
    		let tabName = this.parentElement.parentElement.getAttribute("data-tabName");
    		let fileContent = localStorage.getItem(tabName);
    		let data = JSON.parse(fileContent);
    		data.tabName = tabName;
    		let modifiedFileContent = JSON.stringify(data);
    		var bb = new Blob([modifiedFileContent], { type: "text/plain" });
    		var a = document.createElement("a");
    		a.download = active.tabName + ".json";
    		a.href = window.URL.createObjectURL(bb);
    		a.click();
    	}

    	function openFile(event) {
    		var input = event.target;
    		var reader = new FileReader();

    		reader.onload = function () {
    			importTabFromData(reader.result);
    		};

    		reader.readAsText(input.files[0]);
    	}

    	function importTabFromData(text) {
    		if (!text) return;
    		var newTab = JSON.parse(text);
    		if (!newTab) return;
    		var tabName = newTab.tabName;
    		if (!tabName) return;
    		localStorage.setItem(tabName, text);
    		let storedTabs = getTabsFromLocalStorage();
    		$$invalidate(0, tabs = storedTabs);
    		$$invalidate(1, active = newTab);
    	}

    	function renameTab() {
    		let tabName = active.tabName;
    		let tabUrl = active.url;
    		let tabScheme = active.scheme;
    		let newTabName = tabName;

    		while (tabs.some(tab => newTabName == tab.tabName)) {
    			newTabName = prompt(`Rename "${newTabName}"`, newTabName);
    			if (!newTabName) return;
    		}

    		let data = deleteTabByName(tabName);
    		if (!newTabName) return;

    		let newTab = {
    			tabName: newTabName,
    			url: tabUrl,
    			scheme: tabScheme
    		};

    		$$invalidate(0, tabs = [...tabs, newTab]);
    		$$invalidate(1, active = newTab);

    		if (data) {
    			let fixedData = fixLocalStorageData(data, tabName, newTabName);
    			localStorage.setItem(newTabName, fixedData);
    		}
    	}

    	onMount(async () => {
    		let storedTabs = getTabsFromLocalStorage();
    		$$invalidate(0, tabs = storedTabs.length == 0 ? [] : storedTabs);
    		$$invalidate(1, active = tabs[0]);
    		dispatch("mounted");
    	});

    	const writable_props = ["tabs", "active"];

    	Object_1$3.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tabs> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("tabs" in $$props) $$invalidate(0, tabs = $$props.tabs);
    		if ("active" in $$props) $$invalidate(1, active = $$props.active);
    	};

    	$$self.$capture_state = () => {
    		return { tabs, active };
    	};

    	$$self.$inject_state = $$props => {
    		if ("tabs" in $$props) $$invalidate(0, tabs = $$props.tabs);
    		if ("active" in $$props) $$invalidate(1, active = $$props.active);
    	};

    	return [
    		tabs,
    		active,
    		activate,
    		addTab,
    		deleteTab,
    		exportTab,
    		openFile,
    		renameTab,
    		addNewTab,
    		setActiveTabByName
    	];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			tabs: 0,
    			active: 1,
    			addNewTab: 8,
    			setActiveTabByName: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*active*/ ctx[1] === undefined && !("active" in props)) {
    			console.warn("<Tabs> was created without expected prop 'active'");
    		}
    	}

    	get tabs() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tabs(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addNewTab() {
    		return this.$$.ctx[8];
    	}

    	set addNewTab(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setActiveTabByName() {
    		return this.$$.ctx[9];
    	}

    	set setActiveTabByName(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/AppTabbed.svelte generated by Svelte v3.17.1 */
    const file$9 = "src/AppTabbed.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (172:4) {#each tabs as tab (tab.tabName)}
    function create_each_block$4(key_1, ctx) {
    	let first;
    	let updating_saveInputs;
    	let updating_reloadSchema;
    	let t;
    	let current;

    	function app_saveInputs_binding(value) {
    		/*app_saveInputs_binding*/ ctx[17].call(null, value, /*tab*/ ctx[19]);
    	}

    	function app_reloadSchema_binding(value_1) {
    		/*app_reloadSchema_binding*/ ctx[18].call(null, value_1, /*tab*/ ctx[19]);
    	}

    	let app_props = {
    		parentid: /*tab*/ ctx[19].tabName,
    		url: /*tab*/ ctx[19].url,
    		visible: /*tab*/ ctx[19].tabName == /*active*/ ctx[2].tabName
    	};

    	if (/*tabsSaveFunctions*/ ctx[3][/*tab*/ ctx[19].tabName] !== void 0) {
    		app_props.saveInputs = /*tabsSaveFunctions*/ ctx[3][/*tab*/ ctx[19].tabName];
    	}

    	if (/*tabsReloadFunctions*/ ctx[4][/*tab*/ ctx[19].tabName] !== void 0) {
    		app_props.reloadSchema = /*tabsReloadFunctions*/ ctx[4][/*tab*/ ctx[19].tabName];
    	}

    	const app = new App({ props: app_props, $$inline: true });
    	binding_callbacks.push(() => bind(app, "saveInputs", app_saveInputs_binding));
    	binding_callbacks.push(() => bind(app, "reloadSchema", app_reloadSchema_binding));

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(app.$$.fragment);
    			t = space();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(app, target, anchor);
    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const app_changes = {};
    			if (dirty & /*tabs*/ 2) app_changes.parentid = /*tab*/ ctx[19].tabName;
    			if (dirty & /*tabs*/ 2) app_changes.url = /*tab*/ ctx[19].url;
    			if (dirty & /*tabs, active*/ 6) app_changes.visible = /*tab*/ ctx[19].tabName == /*active*/ ctx[2].tabName;

    			if (!updating_saveInputs && dirty & /*tabsSaveFunctions, tabs*/ 10) {
    				updating_saveInputs = true;
    				app_changes.saveInputs = /*tabsSaveFunctions*/ ctx[3][/*tab*/ ctx[19].tabName];
    				add_flush_callback(() => updating_saveInputs = false);
    			}

    			if (!updating_reloadSchema && dirty & /*tabsReloadFunctions, tabs*/ 18) {
    				updating_reloadSchema = true;
    				app_changes.reloadSchema = /*tabsReloadFunctions*/ ctx[4][/*tab*/ ctx[19].tabName];
    				add_flush_callback(() => updating_reloadSchema = false);
    			}

    			app.$set(app_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(app.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(app.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(app, detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(172:4) {#each tabs as tab (tab.tabName)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div;
    	let updating_tabs;
    	let updating_active;
    	let t;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;

    	function tabs_1_tabs_binding(value) {
    		/*tabs_1_tabs_binding*/ ctx[15].call(null, value);
    	}

    	function tabs_1_active_binding(value_1) {
    		/*tabs_1_active_binding*/ ctx[16].call(null, value_1);
    	}

    	let tabs_1_props = {};

    	if (/*tabs*/ ctx[1] !== void 0) {
    		tabs_1_props.tabs = /*tabs*/ ctx[1];
    	}

    	if (/*active*/ ctx[2] !== void 0) {
    		tabs_1_props.active = /*active*/ ctx[2];
    	}

    	const tabs_1 = new Tabs({ props: tabs_1_props, $$inline: true });
    	/*tabs_1_binding*/ ctx[14](tabs_1);
    	binding_callbacks.push(() => bind(tabs_1, "tabs", tabs_1_tabs_binding));
    	binding_callbacks.push(() => bind(tabs_1, "active", tabs_1_active_binding));
    	tabs_1.$on("newtab", /*delayAndSave*/ ctx[5]);
    	let each_value = /*tabs*/ ctx[1];
    	const get_key = ctx => /*tab*/ ctx[19].tabName;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$4(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(tabs_1.$$.fragment);
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "apptabbed");
    			add_location(div, file$9, 166, 0, 3808);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(tabs_1, div, null);
    			append_dev(div, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tabs_1_changes = {};

    			if (!updating_tabs && dirty & /*tabs*/ 2) {
    				updating_tabs = true;
    				tabs_1_changes.tabs = /*tabs*/ ctx[1];
    				add_flush_callback(() => updating_tabs = false);
    			}

    			if (!updating_active && dirty & /*active*/ 4) {
    				updating_active = true;
    				tabs_1_changes.active = /*active*/ ctx[2];
    				add_flush_callback(() => updating_active = false);
    			}

    			tabs_1.$set(tabs_1_changes);
    			const each_value = /*tabs*/ ctx[1];
    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
    			check_outros();
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs_1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs_1.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*tabs_1_binding*/ ctx[14](null);
    			destroy_component(tabs_1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let tabsElement;
    	let tabs = [];
    	let active;
    	let tabsSaveFunctions = {};
    	let tabsReloadFunctions = {};

    	const unsubscribe = changeCount.subscribe(value => {
    		console.log("From AppTabbed changeCount=", value);
    		if (value > 0) delayAndSave();
    	});

    	function saveActiveTab() {
    		if (!active) return;
    		if (!active.tabName) return;
    		if (!tabsSaveFunctions[active.tabName]) return;
    		tabsSaveFunctions[active.tabName]();
    		console.log("SAVED");
    	}

    	function reloadActiveTab() {
    		console.log("reloadActiveTab");
    		if (!active) return;
    		if (!active.tabName) return;
    		if (!tabsReloadFunctions[active.tabName]) return;
    		tabsReloadFunctions[active.tabName]();
    		console.log("RELOADED");
    	}

    	var reloadTimeout;

    	function delayAndReload() {
    		console.log("delayAndReload");
    		clearTimeout(reloadTimeout);
    		reloadTimeout = setTimeout(reloadActiveTab, 1000);
    	}

    	var saveTimeout;

    	function delayAndSave() {
    		clearTimeout(saveTimeout);
    		saveTimeout = setTimeout(saveActiveTab, 1000);
    	}

    	function getTab(name) {
    		let i = tabs.findIndex(t => t.tabName == name);

    		if (i == -1) {
    			return null;
    		}

    		return tabs[i];
    	}

    	function createOrActivateTab() {
    		console.log("AppTabbed createOrActivateTab");
    		let urlParams = new URLSearchParams(window.location.search);
    		var endPoint = urlParams.get("end_point");
    		var tabName = urlParams.get("tab_name");
    		if (!endPoint || !tabName) return;
    		console.log(tabName, endPoint);
    		console.log(tabs);
    		let tab = getTab(tabName);

    		if (!tab) {
    			tabsElement.addNewTab(tabName, endPoint);
    			delayAndReload();
    			return;
    		}

    		if (tab.tabName == tabName && tab.url == endPoint) {
    			tabsElement.setActiveTabByName(tabName);
    			delayAndReload();
    			return;
    		}

    		if (tab.tabName == tabName && tab.url != endPoint) {
    			let newTabName = tabName;

    			for (let i = 1; i < 100; i++) {
    				newTabName = tabName + i;

    				if (!getTab(newTabName)) {
    					tabsElement.addNewTab(newTabName, endPoint);
    					delayAndReload();
    					return;
    				}
    			}

    			alert("can not create a new tab: " + tabName);
    			return;
    		}
    	}

    	onMount(async () => {
    		createOrActivateTab();
    	});

    	function tabs_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, tabsElement = $$value);
    		});
    	}

    	function tabs_1_tabs_binding(value) {
    		tabs = value;
    		$$invalidate(1, tabs);
    	}

    	function tabs_1_active_binding(value_1) {
    		active = value_1;
    		$$invalidate(2, active);
    	}

    	function app_saveInputs_binding(value, tab) {
    		tabsSaveFunctions[tab.tabName] = value;
    		$$invalidate(3, tabsSaveFunctions);
    	}

    	function app_reloadSchema_binding(value_1, tab) {
    		tabsReloadFunctions[tab.tabName] = value_1;
    		$$invalidate(4, tabsReloadFunctions);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("tabsElement" in $$props) $$invalidate(0, tabsElement = $$props.tabsElement);
    		if ("tabs" in $$props) $$invalidate(1, tabs = $$props.tabs);
    		if ("active" in $$props) $$invalidate(2, active = $$props.active);
    		if ("tabsSaveFunctions" in $$props) $$invalidate(3, tabsSaveFunctions = $$props.tabsSaveFunctions);
    		if ("tabsReloadFunctions" in $$props) $$invalidate(4, tabsReloadFunctions = $$props.tabsReloadFunctions);
    		if ("reloadTimeout" in $$props) reloadTimeout = $$props.reloadTimeout;
    		if ("saveTimeout" in $$props) saveTimeout = $$props.saveTimeout;
    	};

    	return [
    		tabsElement,
    		tabs,
    		active,
    		tabsSaveFunctions,
    		tabsReloadFunctions,
    		delayAndSave,
    		reloadTimeout,
    		saveTimeout,
    		unsubscribe,
    		saveActiveTab,
    		reloadActiveTab,
    		delayAndReload,
    		getTab,
    		createOrActivateTab,
    		tabs_1_binding,
    		tabs_1_tabs_binding,
    		tabs_1_active_binding,
    		app_saveInputs_binding,
    		app_reloadSchema_binding
    	];
    }

    class AppTabbed extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AppTabbed",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    // import App from './App.svelte';


    var app = new AppTabbed({
    	target: document.getElementById('graphql-test') ? document.getElementById('graphql-test') : document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
