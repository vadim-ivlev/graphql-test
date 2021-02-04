
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

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
			if (iterations[i]) iterations[i].d(detaching);
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
		return function(event) {
			event.preventDefault();
			return fn.call(this, event);
		};
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	function set_style(node, key, value) {
		node.style.setProperty(key, value);
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
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	function afterUpdate(fn) {
		get_current_component().$$.after_render.push(fn);
	}

	function createEventDispatcher() {
		const component = current_component;

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

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
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

			while (binding_callbacks.length) binding_callbacks.shift()();

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

	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	function outro_and_destroy_block(block, lookup) {
		on_outro(() => {
			destroy_block(block, lookup);
		});

		block.o(1);
	}

	function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
		let o = old_blocks.length;
		let n = list.length;

		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;

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
			} else if (dynamic) {
				block.p(changed, child_ctx);
			}

			new_lookup.set(key, new_blocks[i] = block);

			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}

		const will_move = new Set();
		const did_move = new Set();

		function insert(block) {
			if (block.i) block.i(1);
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

			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);

			} else {
				will_move.add(old_key);
				o--;
			}
		}

		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}

		while (n) insert(new_blocks[n - 1]);

		return new_blocks;
	}

	function bind(component, name, callback) {
		if (component.$$.props.indexOf(name) === -1) return;
		component.$$.bound[name] = callback;
		callback(component.$$.ctx[name]);
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
			} else {
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
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
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
				if (index !== -1) callbacks.splice(index, 1);
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

	/* src/JsonView.svelte generated by Svelte v3.4.0 */

	const file = "src/JsonView.svelte";

	function create_fragment(ctx) {
		var div;

		return {
			c: function create() {
				div = element("div");
				div.className = "self svelte-1rj0q3e";
				add_location(div, file, 23, 0, 262);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				add_binding_callback(() => ctx.div_binding(div, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.div_binding(null, div);
					ctx.div_binding(div, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.div_binding(null, div);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { json } = $$props;

	let elem;

		function div_binding($$node, check) {
			elem = $$node;
			$$invalidate('elem', elem);
		}

		$$self.$set = $$props => {
			if ('json' in $$props) $$invalidate('json', json = $$props.json);
		};

		$$self.$$.update = ($$dirty = { elem: 1, json: 1 }) => {
			if ($$dirty.elem || $$dirty.json) { try {
	                window.$(elem).jsonViewer(json, { collapsed: true, rootCollapsable: false });
	            } catch (error) {} }
		};

		return { json, elem, div_binding };
	}

	class JsonView extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["json"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.json === undefined && !('json' in props)) {
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

	/* src/schemer/schemer.svelte generated by Svelte v3.4.0 */

	const file$1 = "src/schemer/schemer.svelte";

	// (138:2) {#if Object.entries(scheme).length != 0 }
	function create_if_block_1(ctx) {
		var a, t0_value = ctx.visible?'Hide':'Show', t0, t1, br0, br1, dispose;

		return {
			c: function create() {
				a = element("a");
				t0 = text(t0_value);
				t1 = text(" scheme");
				br0 = element("br");
				br1 = element("br");
				a.href = true;
				add_location(a, file$1, 138, 8, 3563);
				add_location(br0, file$1, 138, 106, 3661);
				add_location(br1, file$1, 138, 110, 3665);
				dispose = listen(a, "click", prevent_default(ctx.click_handler));
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				append(a, t0);
				append(a, t1);
				insert(target, br0, anchor);
				insert(target, br1, anchor);
			},

			p: function update(changed, ctx) {
				if ((changed.visible) && t0_value !== (t0_value = ctx.visible?'Hide':'Show')) {
					set_data(t0, t0_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
					detach(br0);
					detach(br1);
				}

				dispose();
			}
		};
	}

	// (142:2) {#if visible}
	function create_if_block(ctx) {
		var current;

		var jsonview = new JsonView({
			props: { json: ctx.scheme },
			$$inline: true
		});

		return {
			c: function create() {
				jsonview.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(jsonview, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var jsonview_changes = {};
				if (changed.scheme) jsonview_changes.json = ctx.scheme;
				jsonview.$set(jsonview_changes);
			},

			i: function intro(local) {
				if (current) return;
				jsonview.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				jsonview.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				jsonview.$destroy(detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		var div3, form, div2, input0, t0, div0, input1, t1, label, t3, div1, t4, input2, t5, t6, current, dispose;

		var if_block0 = (Object.entries(ctx.scheme).length != 0) && create_if_block_1(ctx);

		var if_block1 = (ctx.visible) && create_if_block(ctx);

		return {
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
				input0.className = "text svelte-1prjgt0";
				attr(input0, "type", "text");
				input0.placeholder = "https://yoursite.com/graphql";
				input0.value = ctx.url;
				add_location(input0, file$1, 127, 12, 2948);
				attr(input1, "type", "checkbox");
				input1.id = "sss5678";
				input1.title = "include credentials to requests";
				add_location(input1, file$1, 129, 16, 3095);
				label.htmlFor = "sss5678";
				label.className = "smaller svelte-1prjgt0";
				add_location(label, file$1, 130, 16, 3219);
				add_location(div0, file$1, 128, 12, 3073);
				div1.className = "errors svelte-1prjgt0";
				add_location(div1, file$1, 132, 12, 3315);
				add_location(div2, file$1, 126, 8, 2930);
				attr(input2, "type", "submit");
				input2.id = "subm444";
				input2.className = "button svelte-1prjgt0";
				input2.value = "↻ reload schema";
				add_location(input2, file$1, 134, 8, 3391);
				form.className = "row svelte-1prjgt0";
				add_location(form, file$1, 125, 2, 2866);
				add_location(div3, file$1, 123, 0, 2857);
				dispose = listen(form, "submit", prevent_default(ctx.getSchema));
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div3, anchor);
				append(div3, form);
				append(form, div2);
				append(div2, input0);
				add_binding_callback(() => ctx.input0_binding(input0, null));
				append(div2, t0);
				append(div2, div0);
				append(div0, input1);
				add_binding_callback(() => ctx.input1_binding(input1, null));
				append(div0, t1);
				append(div0, label);
				append(div2, t3);
				append(div2, div1);
				add_binding_callback(() => ctx.div1_binding(div1, null));
				append(form, t4);
				append(form, input2);
				add_binding_callback(() => ctx.input2_binding(input2, null));
				append(div3, t5);
				if (if_block0) if_block0.m(div3, null);
				append(div3, t6);
				if (if_block1) if_block1.m(div3, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.input0_binding(null, input0);
					ctx.input0_binding(input0, null);
				}

				if (!current || changed.url) {
					input0.value = ctx.url;
				}

				if (changed.items) {
					ctx.input1_binding(null, input1);
					ctx.input1_binding(input1, null);
				}
				if (changed.items) {
					ctx.div1_binding(null, div1);
					ctx.div1_binding(div1, null);
				}
				if (changed.items) {
					ctx.input2_binding(null, input2);
					ctx.input2_binding(input2, null);
				}

				if (Object.entries(ctx.scheme).length != 0) {
					if (if_block0) {
						if_block0.p(changed, ctx);
					} else {
						if_block0 = create_if_block_1(ctx);
						if_block0.c();
						if_block0.m(div3, t6);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (ctx.visible) {
					if (if_block1) {
						if_block1.p(changed, ctx);
						if_block1.i(1);
					} else {
						if_block1 = create_if_block(ctx);
						if_block1.c();
						if_block1.i(1);
						if_block1.m(div3, null);
					}
				} else if (if_block1) {
					group_outros();
					on_outro(() => {
						if_block1.d(1);
						if_block1 = null;
					});

					if_block1.o(1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block1) if_block1.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block1) if_block1.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div3);
				}

				ctx.input0_binding(null, input0);
				ctx.input1_binding(null, input1);
				ctx.div1_binding(null, div1);
				ctx.input2_binding(null, input2);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				dispose();
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

	let { url = "", scheme = {}, parentid ='', urlElement, credentialsElement } = $$props; 

	let errorsElement;
	let submitElement;
	let visible = false;


	const dispatch = createEventDispatcher();


	async function getSchema() {
	    errorsElement.innerText = ''; $$invalidate('errorsElement', errorsElement);
	    submitElement.classList.add("inprogress");
	    // clearSchema()
	    // // scheme = {}    
	    try {

	        // var ajaxOptions = {
	        //     url: urlElement.value, 
	        //     type: "POST", 
	        //     xhrFields : { withCredentials: credentialsElement.checked} ,
	        //     data: { query:queryString, variables: '{}'},
	        // }
	        // scheme =  await jQuery.ajax(ajaxOptions)
	    

	        let fetchOptions = {
	            headers: {
	            'Accept': 'application/json, text/plain, */*',
	            'Content-Type': 'application/json'
	            },
	            method: "POST",  
	            body: JSON.stringify({ query: queryString, variables: {}, operationName: "IntrospectionQuery" }) 
	        };
	        if (credentialsElement.checked){
	            console.log("Sending with credentials included = ", credentialsElement.checked);
	            fetchOptions.credentials = 'include'; 
	        }
	        let resp = await fetch( urlElement.value, fetchOptions );
	        let newScheme = await resp.json();
	        clearSchema();
	        $$invalidate('scheme', scheme = newScheme); 

	    } catch (err) {
	        console.error("get scheme error:", err);
	        errorsElement.innerText = "get scheme error:" + err; $$invalidate('errorsElement', errorsElement);
	    }
	    submitElement.classList.remove("inprogress");
	}

	function clearSchema() {
	    dispatch('clear', { text: 'clear storage' });
	    console.log('Schemer: clearSchema:', parentid);
	}

		function input0_binding($$node, check) {
			urlElement = $$node;
			$$invalidate('urlElement', urlElement);
		}

		function input1_binding($$node, check) {
			credentialsElement = $$node;
			$$invalidate('credentialsElement', credentialsElement);
		}

		function div1_binding($$node, check) {
			errorsElement = $$node;
			$$invalidate('errorsElement', errorsElement);
		}

		function input2_binding($$node, check) {
			submitElement = $$node;
			$$invalidate('submitElement', submitElement);
		}

		function click_handler(e) {visible = ! visible; $$invalidate('visible', visible);}

		$$self.$set = $$props => {
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('urlElement' in $$props) $$invalidate('urlElement', urlElement = $$props.urlElement);
			if ('credentialsElement' in $$props) $$invalidate('credentialsElement', credentialsElement = $$props.credentialsElement);
		};

		return {
			url,
			scheme,
			parentid,
			urlElement,
			credentialsElement,
			errorsElement,
			submitElement,
			visible,
			getSchema,
			input0_binding,
			input1_binding,
			div1_binding,
			input2_binding,
			click_handler
		};
	}

	class Schemer extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["url", "scheme", "parentid", "urlElement", "credentialsElement", "getSchema"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.urlElement === undefined && !('urlElement' in props)) {
				console.warn("<Schemer> was created without expected prop 'urlElement'");
			}
			if (ctx.credentialsElement === undefined && !('credentialsElement' in props)) {
				console.warn("<Schemer> was created without expected prop 'credentialsElement'");
			}
			if (ctx.getSchema === undefined && !('getSchema' in props)) {
				console.warn("<Schemer> was created without expected prop 'getSchema'");
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
			return this.$$.ctx.getSchema;
		}

		set getSchema(value) {
			throw new Error("<Schemer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Argument.svelte generated by Svelte v3.4.0 */

	const file$2 = "src/Argument.svelte";

	function create_fragment$2(ctx) {
		var div, input0, input0_id_value, input0_disabled_value, t0, span0, t1_value = ctx.node.name, t1, span0_class_value, t2, input1, input1_id_value, input1_name_value, input1_disabled_value, input1_placeholder_value, t3, span2, t4, t5, span1, t6_value = ctx.node.type.kind=='NON_NULL'?' !':'', t6, span2_class_value, t7, br, span3, t8_value = ctx.node.description, t8, span3_class_value, dispose;

		return {
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
				t4 = text(ctx.graphqlType);
				t5 = space();
				span1 = element("span");
				t6 = text(t6_value);
				t7 = space();
				br = element("br");
				span3 = element("span");
				t8 = text(t8_value);
				input0.id = input0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-checkbox";
				attr(input0, "type", "checkbox");
				input0.disabled = input0_disabled_value = ctx.node.type.kind=='NON_NULL';
				input0.className = "svelte-17mekll";
				add_location(input0, file$2, 99, 4, 2019);
				span0.className = span0_class_value = "argname " + (ctx.checked?'':'disabled') + " svelte-17mekll";
				add_location(span0, file$2, 100, 4, 2185);
				input1.id = input1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-input";
				input1.className = "input svelte-17mekll";
				input1.name = input1_name_value = ctx.node.name;
				input1.disabled = input1_disabled_value = !ctx.checked;
				input1.placeholder = input1_placeholder_value = ctx.value==''?'':null;
				add_location(input1, file$2, 101, 4, 2254);
				span1.className = "exclamation svelte-17mekll";
				add_location(span1, file$2, 103, 4, 2503);
				span2.className = span2_class_value = "oftype " + (ctx.checked?'':'disabled') + " svelte-17mekll";
				add_location(span2, file$2, 102, 4, 2440);
				add_location(br, file$2, 106, 4, 2595);
				span3.className = span3_class_value = "description " + (ctx.checked?'':'disabled') + " svelte-17mekll";
				add_location(span3, file$2, 106, 8, 2599);
				div.className = "field svelte-17mekll";
				add_location(div, file$2, 98, 0, 1992);

				dispose = [
					listen(input0, "change", ctx.input0_change_handler),
					listen(input0, "change", ctx.change_handler),
					listen(input1, "input", ctx.input1_input_handler),
					listen(input1, "change", ctx.change_handler_1)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input0);

				input0.checked = ctx.checked;

				add_binding_callback(() => ctx.input0_binding(input0, null));
				append(div, t0);
				append(div, span0);
				append(span0, t1);
				append(div, t2);
				append(div, input1);

				input1.value = ctx.value;

				add_binding_callback(() => ctx.input1_binding(input1, null));
				append(div, t3);
				append(div, span2);
				append(span2, t4);
				append(span2, t5);
				append(span2, span1);
				append(span1, t6);
				append(div, t7);
				append(div, br);
				append(div, span3);
				append(span3, t8);
			},

			p: function update(changed, ctx) {
				if (changed.checked) input0.checked = ctx.checked;
				if (changed.items) {
					ctx.input0_binding(null, input0);
					ctx.input0_binding(input0, null);
				}

				if ((changed.parentid || changed.node) && input0_id_value !== (input0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-checkbox")) {
					input0.id = input0_id_value;
				}

				if ((changed.node) && input0_disabled_value !== (input0_disabled_value = ctx.node.type.kind=='NON_NULL')) {
					input0.disabled = input0_disabled_value;
				}

				if ((changed.node) && t1_value !== (t1_value = ctx.node.name)) {
					set_data(t1, t1_value);
				}

				if ((changed.checked) && span0_class_value !== (span0_class_value = "argname " + (ctx.checked?'':'disabled') + " svelte-17mekll")) {
					span0.className = span0_class_value;
				}

				if (changed.value && (input1.value !== ctx.value)) input1.value = ctx.value;
				if (changed.items) {
					ctx.input1_binding(null, input1);
					ctx.input1_binding(input1, null);
				}

				if ((changed.parentid || changed.node) && input1_id_value !== (input1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-input")) {
					input1.id = input1_id_value;
				}

				if ((changed.node) && input1_name_value !== (input1_name_value = ctx.node.name)) {
					input1.name = input1_name_value;
				}

				if ((changed.checked) && input1_disabled_value !== (input1_disabled_value = !ctx.checked)) {
					input1.disabled = input1_disabled_value;
				}

				if ((changed.value) && input1_placeholder_value !== (input1_placeholder_value = ctx.value==''?'':null)) {
					input1.placeholder = input1_placeholder_value;
				}

				if ((changed.node) && t6_value !== (t6_value = ctx.node.type.kind=='NON_NULL'?' !':'')) {
					set_data(t6, t6_value);
				}

				if ((changed.checked) && span2_class_value !== (span2_class_value = "oftype " + (ctx.checked?'':'disabled') + " svelte-17mekll")) {
					span2.className = span2_class_value;
				}

				if ((changed.node) && t8_value !== (t8_value = ctx.node.description)) {
					set_data(t8, t8_value);
				}

				if ((changed.checked) && span3_class_value !== (span3_class_value = "description " + (ctx.checked?'':'disabled') + " svelte-17mekll")) {
					span3.className = span3_class_value;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.input0_binding(null, input0);
				ctx.input1_binding(null, input1);
				run_all(dispose);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		// P R O P S
	let { parentid = '', node = {}, getText = function() {
	    if (!checkboxElement.checked) return ''
	    let value = inputElement.value;
	    // if (inputType == 'text' && graphqlType == 'String'){
	    if (graphqlType == 'String'){
	      value = `"${value.replace(/"/g,'\\"')}"`; 
	    }
	   return `${node.name}: ${value}`
	} } = $$props;

	// if (node.checked === undefined)     node.checked = true
	// if (node.graphqlType === undefined) node.graphqlType = node.type.name || node.type.ofType.name
	// if (node.value === undefined)       node.value = node.defaultValue ||  (node.graphqlType=='Int'? 0 : node.name.replace(/_/g,' '))

	let checked = true;
	let graphqlType = node.type.name || node.type.ofType.name;
	let value;
	if (node.defaultValue){
	    $$invalidate('value', value = graphqlType == "String" ? node.defaultValue.replace(/"/g,'') : node.defaultValue);
	}else {
	    $$invalidate('value', value = (graphqlType=='Int'? 0 :  graphqlType=='Boolean'? false : graphqlType=='String'? node.name.replace(/_/g,' '): null ));
	}


	let checkboxElement;
	let inputElement;
	let inputType = graphqlType=='Int'?'number':'text';



	onMount(async () => {
	    inputElement.setAttribute('type', inputType);
	});

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function input0_change_handler() {
			checked = this.checked;
			$$invalidate('checked', checked);
		}

		function input0_binding($$node, check) {
			checkboxElement = $$node;
			$$invalidate('checkboxElement', checkboxElement);
		}

		function input1_input_handler() {
			value = this.value;
			$$invalidate('value', value);
		}

		function input1_binding($$node, check) {
			inputElement = $$node;
			$$invalidate('inputElement', inputElement);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

		return {
			parentid,
			node,
			getText,
			checked,
			graphqlType,
			value,
			checkboxElement,
			inputElement,
			change_handler,
			change_handler_1,
			input0_change_handler,
			input0_binding,
			input1_input_handler,
			input1_binding
		};
	}

	class Argument extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["parentid", "node", "getText"]);
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

	/* src/TypeField.svelte generated by Svelte v3.4.0 */

	const file$3 = "src/TypeField.svelte";

	// (50:4) {#if showCheckbox}
	function create_if_block$1(ctx) {
		var input, input_id_value, dispose;

		return {
			c: function create() {
				input = element("input");
				attr(input, "type", "checkbox");
				input.checked = true;
				input.id = input_id_value = "" + ctx.parentid + "-" + ctx.fieldName;
				input.className = "svelte-1y7pqhv";
				add_location(input, file$3, 50, 8, 894);
				dispose = listen(input, "change", ctx.change_handler);
			},

			m: function mount(target, anchor) {
				insert(target, input, anchor);
				add_binding_callback(() => ctx.input_binding(input, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.input_binding(null, input);
					ctx.input_binding(input, null);
				}

				if ((changed.parentid) && input_id_value !== (input_id_value = "" + ctx.parentid + "-" + ctx.fieldName)) {
					input.id = input_id_value;
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(input);
				}

				ctx.input_binding(null, input);
				dispose();
			}
		};
	}

	function create_fragment$3(ctx) {
		var div, t0, span0, t1, t2, updating_getText, t3, br, span1, t4_value = ctx.node.description, t4, current;

		var if_block = (ctx.showCheckbox) && create_if_block$1(ctx);

		function type_getText_binding(value) {
			ctx.type_getText_binding.call(null, value);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let type_props = {
			scheme: ctx.scheme,
			typeName: ctx.typeName,
			showCheckbox: ctx.showCheckbox,
			level: ctx.level,
			padding: ctx.padding,
			parentid: "" + ctx.parentid + "-" + ctx.fieldName + "-type"
		};
		if (ctx.getTypeText !== void 0) {
			type_props.getText = ctx.getTypeText;
		}
		var type = new Type({ props: type_props, $$inline: true });

		add_binding_callback(() => bind(type, 'getText', type_getText_binding));
		type.$on("change", ctx.change_handler_1);

		return {
			c: function create() {
				div = element("div");
				if (if_block) if_block.c();
				t0 = space();
				span0 = element("span");
				t1 = text(ctx.fieldName);
				t2 = space();
				type.$$.fragment.c();
				t3 = space();
				br = element("br");
				span1 = element("span");
				t4 = text(t4_value);
				span0.className = "field-name svelte-1y7pqhv";
				add_location(span0, file$3, 52, 4, 1007);
				br.className = "svelte-1y7pqhv";
				add_location(br, file$3, 54, 4, 1215);
				span1.className = "field-description svelte-1y7pqhv";
				add_location(span1, file$3, 54, 8, 1219);
				div.className = "field svelte-1y7pqhv";
				add_location(div, file$3, 48, 0, 841);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if (if_block) if_block.m(div, null);
				append(div, t0);
				append(div, span0);
				append(span0, t1);
				append(div, t2);
				mount_component(type, div, null);
				append(div, t3);
				append(div, br);
				append(div, span1);
				append(span1, t4);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.showCheckbox) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						if_block.m(div, t0);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				var type_changes = {};
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.typeName) type_changes.typeName = ctx.typeName;
				if (changed.showCheckbox) type_changes.showCheckbox = ctx.showCheckbox;
				if (changed.level) type_changes.level = ctx.level;
				if (changed.padding) type_changes.padding = ctx.padding;
				if (changed.parentid || changed.fieldName) type_changes.parentid = "" + ctx.parentid + "-" + ctx.fieldName + "-type";
				if (!updating_getText && changed.getTypeText) {
					type_changes.getText = ctx.getTypeText;
				}
				type.$set(type_changes);

				if ((!current || changed.node) && t4_value !== (t4_value = ctx.node.description)) {
					set_data(t4, t4_value);
				}
			},

			i: function intro(local) {
				if (current) return;
				type.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				type.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if (if_block) if_block.d();

				type.$destroy();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { parentid = '', scheme, node, showCheckbox = true, level = 0, padding = '  ', getText = function(e){
	    if (! checkboxElement) return ''
	    if (checkboxElement.checked == false) return ''
	    let value = fieldName + getTypeText();
	    return value
	} } = $$props;


	let fieldName = node.name;
	let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name;
	let getTypeText;
	let checkboxElement;

		function change_handler(event) {
			bubble($$self, event);
		}

		function change_handler_1(event) {
			bubble($$self, event);
		}

		function input_binding($$node, check) {
			checkboxElement = $$node;
			$$invalidate('checkboxElement', checkboxElement);
		}

		function type_getText_binding(value) {
			getTypeText = value;
			$$invalidate('getTypeText', getTypeText);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('showCheckbox' in $$props) $$invalidate('showCheckbox', showCheckbox = $$props.showCheckbox);
			if ('level' in $$props) $$invalidate('level', level = $$props.level);
			if ('padding' in $$props) $$invalidate('padding', padding = $$props.padding);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

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
			checkboxElement,
			change_handler,
			change_handler_1,
			input_binding,
			type_getText_binding
		};
	}

	class TypeField extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, ["parentid", "scheme", "node", "showCheckbox", "level", "padding", "getText"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.scheme === undefined && !('scheme' in props)) {
				console.warn("<TypeField> was created without expected prop 'scheme'");
			}
			if (ctx.node === undefined && !('node' in props)) {
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

	/* src/Type.svelte generated by Svelte v3.4.0 */

	const file$4 = "src/Type.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.f = list[i];
		child_ctx.ind = i;
		return child_ctx;
	}

	// (115:0) {#if node}
	function create_if_block$2(ctx) {
		var div, current_block_type_index, if_block, current;

		var if_block_creators = [
			create_if_block_1$1,
			create_else_block
		];

		var if_blocks = [];

		function select_block_type(ctx) {
			if (ctx.node.kind=="SCALAR") return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c: function create() {
				div = element("div");
				if_block.c();
				div.className = "self svelte-jn0n43";
				add_location(div, file$4, 115, 0, 2281);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				if_blocks[current_block_type_index].m(div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				var previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);
				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(changed, ctx);
				} else {
					group_outros();
					on_outro(() => {
						if_blocks[previous_block_index].d(1);
						if_blocks[previous_block_index] = null;
					});
					if_block.o(1);
					check_outros();

					if_block = if_blocks[current_block_type_index];
					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}
					if_block.i(1);
					if_block.m(div, null);
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
					detach(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	// (119:4) {:else}
	function create_else_block(ctx) {
		var a, t0, a_class_value, t1, div, span, t2_value = ctx.node.description, t2, t3, current, dispose;

		var if_block = (ctx.node.fields) && create_if_block_2(ctx);

		return {
			c: function create() {
				a = element("a");
				t0 = text(ctx.typeName);
				t1 = space();
				div = element("div");
				span = element("span");
				t2 = text(t2_value);
				t3 = space();
				if (if_block) if_block.c();
				a.className = a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-jn0n43";
				a.href = true;
				add_location(a, file$4, 119, 8, 2403);
				span.className = "description svelte-jn0n43";
				add_location(span, file$4, 121, 16, 2585);
				div.className = "frame svelte-jn0n43";
				set_style(div, "display", (ctx.vis?'block':'none'));
				add_location(div, file$4, 120, 12, 2512);
				dispose = listen(a, "click", prevent_default(ctx.click_handler));
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				append(a, t0);
				insert(target, t1, anchor);
				insert(target, div, anchor);
				append(div, span);
				append(span, t2);
				append(div, t3);
				if (if_block) if_block.m(div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if (!current || changed.typeName) {
					set_data(t0, ctx.typeName);
				}

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "" + (ctx.vis?'opened':'closed') + " svelte-jn0n43")) {
					a.className = a_class_value;
				}

				if (ctx.node.fields) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block_2(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div, null);
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

				if (!current || changed.vis) {
					set_style(div, "display", (ctx.vis?'block':'none'));
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
					detach(div);
				}

				if (if_block) if_block.d();
				dispose();
			}
		};
	}

	// (117:4) {#if node.kind=="SCALAR"}
	function create_if_block_1$1(ctx) {
		var span, t;

		return {
			c: function create() {
				span = element("span");
				t = text(ctx.typeName);
				span.className = "scalar-type svelte-jn0n43";
				add_location(span, file$4, 117, 9, 2339);
			},

			m: function mount(target, anchor) {
				insert(target, span, anchor);
				append(span, t);
			},

			p: function update(changed, ctx) {
				if (changed.typeName) {
					set_data(t, ctx.typeName);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (123:16) {#if node.fields}
	function create_if_block_2(ctx) {
		var div, current;

		var each_value = ctx.node.fields;

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

		return {
			c: function create() {
				div = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "fieldlist svelte-jn0n43";
				add_location(div, file$4, 123, 20, 2691);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.showCheckbox || changed.scheme || changed.level || changed.padding || changed.node || changed.parentid || changed.typeName || changed.fieldFunctions) {
					each_value = ctx.node.fields;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(div, null);
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
				for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	// (125:20) {#each node.fields as f,ind}
	function create_each_block(ctx) {
		var updating_getText, current;

		function typefield_getText_binding(value) {
			ctx.typefield_getText_binding.call(null, value, ctx);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let typefield_props = {
			showCheckbox: ctx.showCheckbox,
			scheme: ctx.scheme,
			level: ctx.level+1,
			padding: ctx.padding,
			node: ctx.f,
			parentid: "" + ctx.parentid + "-" + ctx.typeName
		};
		if (ctx.fieldFunctions[ctx.f.name] !== void 0) {
			typefield_props.getText = ctx.fieldFunctions[ctx.f.name];
		}
		var typefield = new TypeField({ props: typefield_props, $$inline: true });

		add_binding_callback(() => bind(typefield, 'getText', typefield_getText_binding));
		typefield.$on("change", ctx.change_handler);

		return {
			c: function create() {
				typefield.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(typefield, target, anchor);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var typefield_changes = {};
				if (changed.showCheckbox) typefield_changes.showCheckbox = ctx.showCheckbox;
				if (changed.scheme) typefield_changes.scheme = ctx.scheme;
				if (changed.level) typefield_changes.level = ctx.level+1;
				if (changed.padding) typefield_changes.padding = ctx.padding;
				if (changed.node) typefield_changes.node = ctx.f;
				if (changed.parentid || changed.typeName) typefield_changes.parentid = "" + ctx.parentid + "-" + ctx.typeName;
				if (!updating_getText && changed.fieldFunctions || changed.node) {
					typefield_changes.getText = ctx.fieldFunctions[ctx.f.name];
				}
				typefield.$set(typefield_changes);
			},

			i: function intro(local) {
				if (current) return;
				typefield.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				typefield.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				typefield.$destroy(detaching);
			}
		};
	}

	function create_fragment$4(ctx) {
		var if_block_anchor, current;

		var if_block = (ctx.node) && create_if_block$2(ctx);

		return {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.node) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block$2(ctx);
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
				if (if_block) if_block.d(detaching);

				if (detaching) {
					detach(if_block_anchor);
				}
			}
		};
	}

	function getNode(scheme, typeName){
	if (scheme && scheme.data && scheme.data.__schema){
	    let nodes = scheme.data.__schema.types.filter(t =>  t.name == typeName );
	    if (nodes.length > 0) {
	        return nodes[0]
	    }
	    return null
	} 
	return null
	}

	function instance$4($$self, $$props, $$invalidate) {
		


	// P R O P S
	let { parentid = '', scheme = {}, typeName = '', showCheckbox = true, level = 0, padding = '  ', getText = function () {
	    let a =[];
	    // let p = '  '

	    for (let key in fieldFunctions) {
	        let v = fieldFunctions[key]();
	        if (v) a.push( padding.repeat(level+1) + v );
	    }

	    if (a.length > 0) 
	        // return '\n'+ padding.repeat(level)+'{\n' +a.join('\n') + '\n'+ padding.repeat(level) +'}'
	        return ' {\n' +a.join('\n') + '\n'+ padding.repeat(level) +'}'
	    
	    return ''
	} } = $$props;

	let fieldFunctions = {};
	let node = getNode(scheme, typeName);
	let vis = false;

		function change_handler(event) {
			bubble($$self, event);
		}

		function click_handler(e) {
			const $$result = vis = !vis;
			$$invalidate('vis', vis);
			return $$result;
		}

		function typefield_getText_binding(value, { f }) {
			fieldFunctions[f.name] = value;
			$$invalidate('fieldFunctions', fieldFunctions);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('typeName' in $$props) $$invalidate('typeName', typeName = $$props.typeName);
			if ('showCheckbox' in $$props) $$invalidate('showCheckbox', showCheckbox = $$props.showCheckbox);
			if ('level' in $$props) $$invalidate('level', level = $$props.level);
			if ('padding' in $$props) $$invalidate('padding', padding = $$props.padding);
			if ('getText' in $$props) $$invalidate('getText', getText = $$props.getText);
		};

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
			vis,
			change_handler,
			click_handler,
			typefield_getText_binding
		};
	}

	class Type extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, ["parentid", "scheme", "typeName", "showCheckbox", "level", "padding", "getText"]);
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

	function noop$1() {}

	function safe_not_equal$1(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}
	function writable(value, start = noop$1) {
	    let stop;
	    const subscribers = [];
	    function set(new_value) {
	        if (safe_not_equal$1(value, new_value)) {
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
	    function subscribe$$1(run$$1, invalidate = noop$1) {
	        const subscriber = [run$$1, invalidate];
	        subscribers.push(subscriber);
	        if (subscribers.length === 1) {
	            stop = start(set) || noop$1;
	        }
	        run$$1(value);
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
	    return { set, update, subscribe: subscribe$$1 };
	}

	const changeCount = writable(0);

	/* src/Func.svelte generated by Svelte v3.4.0 */

	const file$5 = "src/Func.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.arg = list[i];
		return child_ctx;
	}

	// (441:16) {#if node.args}
	function create_if_block$3(ctx) {
		var h3, t0_value = ctx.node.name, t0, t1, t2, div0, t4, div1, each_blocks = [], each_1_lookup = new Map(), current;

		var each_value = ctx.node.args;

		const get_key = ctx => ctx.arg.name;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$1(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
		}

		return {
			c: function create() {
				h3 = element("h3");
				t0 = text(t0_value);
				t1 = text("(...)");
				t2 = space();
				div0 = element("div");
				div0.textContent = "ARGUMENTS";
				t4 = space();
				div1 = element("div");

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();
				h3.className = "svelte-ko15t2";
				add_location(h3, file$5, 441, 16, 9601);
				div0.className = "header svelte-ko15t2";
				add_location(div0, file$5, 442, 16, 9643);
				div1.className = "fieldlist svelte-ko15t2";
				add_location(div1, file$5, 443, 16, 9696);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
				append(h3, t0);
				append(h3, t1);
				insert(target, t2, anchor);
				insert(target, div0, anchor);
				insert(target, t4, anchor);
				insert(target, div1, anchor);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(div1, null);

				current = true;
			},

			p: function update(changed, ctx) {
				if ((!current || changed.node) && t0_value !== (t0_value = ctx.node.name)) {
					set_data(t0, t0_value);
				}

				const each_value = ctx.node.args;

				group_outros();
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
				check_outros();
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].o();

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(h3);
					detach(t2);
					detach(div0);
					detach(t4);
					detach(div1);
				}

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();
			}
		};
	}

	// (445:20) {#each node.args as arg (arg.name)}
	function create_each_block$1(key_1, ctx) {
		var first, updating_getText, current;

		function argument_getText_binding(value) {
			ctx.argument_getText_binding.call(null, value, ctx);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let argument_props = {
			node: ctx.arg,
			parentid: "" + ctx.parentid + "-" + ctx.node.name + "-argument"
		};
		if (ctx.getArgFunctions[ctx.arg.name] !== void 0) {
			argument_props.getText = ctx.getArgFunctions[ctx.arg.name];
		}
		var argument = new Argument({ props: argument_props, $$inline: true });

		add_binding_callback(() => bind(argument, 'getText', argument_getText_binding));
		argument.$on("change", ctx.generateQuery);

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = empty();
				argument.$$.fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);
				mount_component(argument, target, anchor);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var argument_changes = {};
				if (changed.node) argument_changes.node = ctx.arg;
				if (changed.parentid || changed.node) argument_changes.parentid = "" + ctx.parentid + "-" + ctx.node.name + "-argument";
				if (!updating_getText && changed.getArgFunctions || changed.node) {
					argument_changes.getText = ctx.getArgFunctions[ctx.arg.name];
				}
				argument.$set(argument_changes);
			},

			i: function intro(local) {
				if (current) return;
				argument.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				argument.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(first);
				}

				argument.$destroy(detaching);
			}
		};
	}

	function create_fragment$5(ctx) {
		var div24, div0, a, t0_value = ctx.node.name, t0, t1, a_class_value, t2, span0, t3, span1, t4_value = ctx.node.description, t4, t5, div23, div3, t6, div2, div1, t7, t8_value = ctx.node.type.kind == "LIST" ? '[...]': '', t8, t9, updating_getText, t10, form_1, div6, div4, t12, div5, textarea0, textarea0_id_value, t13, div9, div7, t15, div8, textarea1, textarea1_id_value, t16, div12, div10, t18, div11, span2, br, t20, input0, t21, div13, input1, t22, div22, div14, t24, div17, div15, t25, span3, t26_value = ctx.response?'':null, t26, t27, div16, t28, div21, div18, span4, t30, input2, t31, div19, textarea2, textarea2_id_value, t32, div20, span5, t33, span6, current, dispose;

		var if_block = (ctx.node.args) && create_if_block$3(ctx);

		function type_getText_binding(value) {
			ctx.type_getText_binding.call(null, value);
			updating_getText = true;
			add_flush_callback(() => updating_getText = false);
		}

		let type_props = {
			typeName: ctx.node.type.name || ctx.node.type.ofType.name,
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-" + ctx.node.name,
			level: 1
		};
		if (ctx.getTypeText !== void 0) {
			type_props.getText = ctx.getTypeText;
		}
		var type = new Type({ props: type_props, $$inline: true });

		add_binding_callback(() => bind(type, 'getText', type_getText_binding));
		type.$on("change", ctx.generateQuery);

		return {
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
				type.$$.fragment.c();
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
				a.className = a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-ko15t2";
				a.href = true;
				add_location(a, file$5, 430, 8, 9089);
				span0.className = "test-result svelte-ko15t2";
				add_location(span0, file$5, 431, 8, 9208);
				span1.className = "description svelte-ko15t2";
				add_location(span1, file$5, 432, 8, 9269);
				div0.className = "outer svelte-ko15t2";
				add_location(div0, file$5, 429, 4, 9061);
				div1.className = "header svelte-ko15t2";
				add_location(div1, file$5, 452, 20, 10075);
				add_location(div2, file$5, 451, 16, 10049);
				div3.className = "form-area svelte-ko15t2";
				add_location(div3, file$5, 438, 8, 9507);
				div4.className = "header svelte-ko15t2";
				add_location(div4, file$5, 461, 16, 10493);
				textarea0.id = textarea0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-query";
				textarea0.name = "query";
				textarea0.value = ctx.request;
				textarea0.className = "svelte-ko15t2";
				add_location(textarea0, file$5, 463, 20, 10610);
				div5.className = "queryFrame svelte-ko15t2";
				add_location(div5, file$5, 462, 16, 10542);
				add_location(div6, file$5, 460, 12, 10471);
				div7.className = "header svelte-ko15t2";
				add_location(div7, file$5, 467, 16, 10820);
				textarea1.id = textarea1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-variables";
				textarea1.name = "variables";
				textarea1.className = "svelte-ko15t2";
				add_location(textarea1, file$5, 469, 20, 10949);
				div8.className = "variablesFrame svelte-ko15t2";
				add_location(div8, file$5, 468, 16, 10873);
				add_location(div9, file$5, 466, 12, 10798);
				div10.className = "header svelte-ko15t2";
				add_location(div10, file$5, 473, 16, 11161);
				add_location(span2, file$5, 476, 20, 11414);
				add_location(br, file$5, 476, 44, 11438);
				attr(input0, "type", "file");
				input0.name = "file";
				add_location(input0, file$5, 477, 20, 11463);
				div11.className = "margined svelte-ko15t2";
				add_location(div11, file$5, 474, 16, 11208);
				add_location(div12, file$5, 472, 12, 11139);
				attr(input1, "type", "submit");
				input1.className = "button  svelte-ko15t2";
				input1.value = "query & run test";
				add_location(input1, file$5, 481, 16, 11587);
				div13.className = "buttons svelte-ko15t2";
				add_location(div13, file$5, 480, 12, 11549);
				form_1.className = "svelte-ko15t2";
				add_location(form_1, file$5, 459, 8, 10412);
				div14.className = "header svelte-ko15t2";
				add_location(div14, file$5, 487, 12, 11736);
				span3.className = "json-literal";
				add_location(span3, file$5, 489, 32, 11843);
				add_location(div15, file$5, 489, 16, 11827);
				div16.className = "response svelte-ko15t2";
				add_location(div16, file$5, 490, 16, 11918);
				div17.className = "response-area svelte-ko15t2";
				add_location(div17, file$5, 488, 12, 11783);
				add_location(span4, file$5, 494, 20, 12066);
				attr(input2, "type", "button");
				input2.className = "button svelte-ko15t2";
				input2.value = "run ▶";
				add_location(input2, file$5, 495, 20, 12114);
				div18.className = "header svelte-ko15t2";
				add_location(div18, file$5, 493, 16, 12025);
				textarea2.id = textarea2_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-eval-text";
				textarea2.value = "response && !response.errors";
				textarea2.className = "svelte-ko15t2";
				add_location(textarea2, file$5, 498, 20, 12296);
				div19.className = "evalFrame svelte-ko15t2";
				add_location(div19, file$5, 497, 16, 12230);
				span5.className = "eval-result svelte-ko15t2";
				add_location(span5, file$5, 502, 20, 12624);
				span6.className = "eval-errors svelte-ko15t2";
				add_location(span6, file$5, 503, 20, 12696);
				div20.className = "buttons2 svelte-ko15t2";
				add_location(div20, file$5, 500, 16, 12478);
				add_location(div21, file$5, 492, 12, 12003);
				div22.className = "result-panel svelte-ko15t2";
				add_location(div22, file$5, 486, 8, 11697);
				div23.className = "root shadow svelte-ko15t2";
				set_style(div23, "display", (ctx.vis?'grid':'none'));
				add_location(div23, file$5, 434, 4, 9336);
				add_location(div24, file$5, 428, 0, 9050);

				dispose = [
					listen(a, "click", prevent_default(ctx.toggleVisibility)),
					listen(textarea0, "change", ctx.incChangeCounter),
					listen(textarea1, "change", ctx.incChangeCounter),
					listen(form_1, "submit", ctx.submitForm),
					listen(input2, "click", ctx.evaluate),
					listen(textarea2, "change", ctx.incChangeCounter)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div24, anchor);
				append(div24, div0);
				append(div0, a);
				append(a, t0);
				append(a, t1);
				append(div0, t2);
				append(div0, span0);
				span0.innerHTML = ctx.testResult;
				append(div0, t3);
				append(div0, span1);
				append(span1, t4);
				append(div24, t5);
				append(div24, div23);
				append(div23, div3);
				if (if_block) if_block.m(div3, null);
				append(div3, t6);
				append(div3, div2);
				append(div2, div1);
				append(div1, t7);
				append(div1, t8);
				append(div2, t9);
				mount_component(type, div2, null);
				add_binding_callback(() => ctx.div3_binding(div3, null));
				append(div23, t10);
				append(div23, form_1);
				append(form_1, div6);
				append(div6, div4);
				append(div6, t12);
				append(div6, div5);
				append(div5, textarea0);
				add_binding_callback(() => ctx.textarea0_binding(textarea0, null));
				add_binding_callback(() => ctx.div5_binding(div5, null));
				append(form_1, t13);
				append(form_1, div9);
				append(div9, div7);
				append(div9, t15);
				append(div9, div8);
				append(div8, textarea1);
				add_binding_callback(() => ctx.textarea1_binding(textarea1, null));
				add_binding_callback(() => ctx.div8_binding(div8, null));
				append(form_1, t16);
				append(form_1, div12);
				append(div12, div10);
				append(div12, t18);
				append(div12, div11);
				append(div11, span2);
				append(div11, br);
				append(div11, t20);
				append(div11, input0);
				append(form_1, t21);
				append(form_1, div13);
				append(div13, input1);
				add_binding_callback(() => ctx.form_1_binding(form_1, null));
				append(div23, t22);
				append(div23, div22);
				append(div22, div14);
				append(div22, t24);
				append(div22, div17);
				append(div17, div15);
				append(div15, t25);
				append(div15, span3);
				append(span3, t26);
				append(div17, t27);
				append(div17, div16);
				add_binding_callback(() => ctx.div16_binding(div16, null));
				append(div22, t28);
				append(div22, div21);
				append(div21, div18);
				append(div18, span4);
				append(div18, t30);
				append(div18, input2);
				append(div21, t31);
				append(div21, div19);
				append(div19, textarea2);
				add_binding_callback(() => ctx.textarea2_binding(textarea2, null));
				add_binding_callback(() => ctx.div19_binding(div19, null));
				append(div21, t32);
				append(div21, div20);
				append(div20, span5);
				span5.innerHTML = ctx.testResult;
				append(div20, t33);
				append(div20, span6);
				span6.innerHTML = ctx.evalErrors;
				current = true;
			},

			p: function update(changed, ctx) {
				if ((!current || changed.node) && t0_value !== (t0_value = ctx.node.name)) {
					set_data(t0, t0_value);
				}

				if ((!current || changed.vis) && a_class_value !== (a_class_value = "name " + (ctx.vis?'opened':'closed') + " svelte-ko15t2")) {
					a.className = a_class_value;
				}

				if (!current || changed.testResult) {
					span0.innerHTML = ctx.testResult;
				}

				if ((!current || changed.node) && t4_value !== (t4_value = ctx.node.description)) {
					set_data(t4, t4_value);
				}

				if (ctx.node.args) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block$3(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div3, t6);
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

				if ((!current || changed.node) && t8_value !== (t8_value = ctx.node.type.kind == "LIST" ? '[...]': '')) {
					set_data(t8, t8_value);
				}

				var type_changes = {};
				if (changed.node) type_changes.typeName = ctx.node.type.name || ctx.node.type.ofType.name;
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.parentid || changed.node) type_changes.parentid = "" + ctx.parentid + "-" + ctx.node.name;
				if (!updating_getText && changed.getTypeText) {
					type_changes.getText = ctx.getTypeText;
				}
				type.$set(type_changes);

				if (changed.items) {
					ctx.div3_binding(null, div3);
					ctx.div3_binding(div3, null);
				}
				if (changed.items) {
					ctx.textarea0_binding(null, textarea0);
					ctx.textarea0_binding(textarea0, null);
				}

				if ((!current || changed.parentid || changed.node) && textarea0_id_value !== (textarea0_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-query")) {
					textarea0.id = textarea0_id_value;
				}

				if (!current || changed.request) {
					textarea0.value = ctx.request;
				}

				if (changed.items) {
					ctx.div5_binding(null, div5);
					ctx.div5_binding(div5, null);
				}
				if (changed.items) {
					ctx.textarea1_binding(null, textarea1);
					ctx.textarea1_binding(textarea1, null);
				}

				if ((!current || changed.parentid || changed.node) && textarea1_id_value !== (textarea1_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-variables")) {
					textarea1.id = textarea1_id_value;
				}

				if (changed.items) {
					ctx.div8_binding(null, div8);
					ctx.div8_binding(div8, null);
				}
				if (changed.items) {
					ctx.form_1_binding(null, form_1);
					ctx.form_1_binding(form_1, null);
				}

				if ((!current || changed.response) && t26_value !== (t26_value = ctx.response?'':null)) {
					set_data(t26, t26_value);
				}

				if (changed.items) {
					ctx.div16_binding(null, div16);
					ctx.div16_binding(div16, null);
				}
				if (changed.items) {
					ctx.textarea2_binding(null, textarea2);
					ctx.textarea2_binding(textarea2, null);
				}

				if ((!current || changed.parentid || changed.node) && textarea2_id_value !== (textarea2_id_value = "" + ctx.parentid + "-" + ctx.node.name + "-eval-text")) {
					textarea2.id = textarea2_id_value;
				}

				if (changed.items) {
					ctx.div19_binding(null, div19);
					ctx.div19_binding(div19, null);
				}

				if (!current || changed.testResult) {
					span5.innerHTML = ctx.testResult;
				}

				if (!current || changed.evalErrors) {
					span6.innerHTML = ctx.evalErrors;
				}

				if (!current || changed.vis) {
					set_style(div23, "display", (ctx.vis?'grid':'none'));
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();

				type.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				type.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div24);
				}

				if (if_block) if_block.d();

				type.$destroy();

				ctx.div3_binding(null, div3);
				ctx.textarea0_binding(null, textarea0);
				ctx.div5_binding(null, div5);
				ctx.textarea1_binding(null, textarea1);
				ctx.div8_binding(null, div8);
				ctx.form_1_binding(null, form_1);
				ctx.div16_binding(null, div16);
				ctx.textarea2_binding(null, textarea2);
				ctx.div19_binding(null, div19);
				run_all(dispose);
			}
		};
	}

	function onCodeMirrorChange(cm) {
	var txt = cm.getDoc().getValue();
	var textarea = cm.getTextArea();
	textarea.value = txt;
	}

	function instance$5($$self, $$props, $$invalidate) {
		let $changeCount;

		validate_store(changeCount, 'changeCount');
		subscribe($$self, changeCount, $$value => { $changeCount = $$value; $$invalidate('$changeCount', $changeCount); });

		



	// P R O P S
	let { urlElement, credentialsElement, parentid = '', scheme = {}, node = {}, operation = "", test = submitForm } = $$props;


	let testResult ='';
	let evalErrors ='';
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
	let getArgFunctions ={};


	function getArgsText() {
	    let args = [];
	    for (let [key,f] of Object.entries(getArgFunctions)) {
	        let text = f();
	        if (text) args.push(text);
	    }
	    let argsText = args.length == 0? '' : `(\n${ args.join(',\n') }\n)`;
	    return argsText
	}



	function generateQuery(el){
	    console.log("generateQuery:", el);
	    let arglist = getArgsText();
	    let fieldlist =getTypeText ? getTypeText() : '';
	    $$invalidate('request', request = `${operation} {\n${node.name}${arglist}${fieldlist}\n}`);
	    if (queryCodeMirror){
	        queryCodeMirror.getDoc().setValue(request);
	    }
	    incChangeCounter();
	}



	function submitForm(event){
	    if (event) event.preventDefault();
	    console.log("submitForm credentialsElement=",credentialsElement.checked," urlElement.value=", urlElement.value);

	    var ajaxOptions = {
	        url: urlElement.value, 
	        type: 'POST',
	        xhrFields : { withCredentials: credentialsElement.checked} ,
	        success: function(res) {
	            $$invalidate('response', response = res);
	            window.$(responseArea).jsonViewer(res, {collapsed: true, rootCollapsable: false});
	            evaluate();
	        }
	    };

	    window.$(form).ajaxSubmit(ajaxOptions);

	    return false
	}

	function evaluate(){
	    $$invalidate('testResult', testResult = "");
	    $$invalidate('evalErrors', evalErrors = "");
	    let code = evalTextarea.value;
	    code = code.trimStart();
	    code = code.trimEnd();
	    if (code == "") {
	        $$invalidate('evalErrors', evalErrors = `<br>// Write code to evaluate server response.<br>// For example:<br>response.errors == null`);
	        return
	    }

	    try {
	        let result = eval(code);
	        $$invalidate('testResult', testResult = result);        
	    } catch (error) {
	        console.log(error);
	        $$invalidate('evalErrors', evalErrors = error);
	    }
	}

	function incChangeCounter(a) {
	    console.log('incChangeCounter', $changeCount, a);
	    $changeCount +=1; changeCount.set($changeCount);
	}


	let jsOptions =  {
	    mode:  "javascript",
	    extraKeys: {'Ctrl-Space':'autocomplete'},
	    autoRefresh:true,
	    autoCloseBrackets: true,
	    matchBrackets: true,
	    tabSize:2,
	    theme: "eclipse",
	};

	// let graphqlOptions = {
	//     mode: 'graphql',
	//     // lint: {
	//     //     schema: myGraphQLSchema
	//     // },
	//     // hintOptions: {
	//     //     schema: myGraphQLSchema
	//     // }
	// }



	function addCodeMirrors() {
	    if (! evalCodeMirror) { 
	        $$invalidate('evalCodeMirror', evalCodeMirror = CodeMirror.fromTextArea( evalTextarea, jsOptions ));
	        evalCodeMirror.on('blur', incChangeCounter);
	        evalCodeMirror.on('change', onCodeMirrorChange);
	    }

	    if (! variablesCodeMirror) { 
	        $$invalidate('variablesCodeMirror', variablesCodeMirror = CodeMirror.fromTextArea( variablesTextarea, jsOptions ));
	        variablesCodeMirror.on('blur', incChangeCounter);
	        variablesCodeMirror.on('change', onCodeMirrorChange);
	    }

	    if (! queryCodeMirror) { 
	        $$invalidate('queryCodeMirror', queryCodeMirror = CodeMirror.fromTextArea( queryTextarea, jsOptions));
	        queryCodeMirror.on('blur', incChangeCounter);
	        queryCodeMirror.on('change', onCodeMirrorChange);
	    }
	}

	function removeCodeMirrors(params) {
	    if ( evalCodeMirror) {
	        evalCodeMirror.off('blur', incChangeCounter);
	        evalCodeMirror.off('change', onCodeMirrorChange);
	        evalCodeMirror.toTextArea();
	        $$invalidate('evalCodeMirror', evalCodeMirror = null);
	    }

	    if ( variablesCodeMirror) {
	        variablesCodeMirror.off('blur', incChangeCounter);
	        variablesCodeMirror.off('change', onCodeMirrorChange);
	        variablesCodeMirror.toTextArea();
	        $$invalidate('variablesCodeMirror', variablesCodeMirror = null);
	    }

	    if ( queryCodeMirror) {
	        queryCodeMirror.off('blur', incChangeCounter);
	        queryCodeMirror.off('change', onCodeMirrorChange);
	        queryCodeMirror.toTextArea();
	        $$invalidate('queryCodeMirror', queryCodeMirror = null);
	    }
	}

	function toggleVisibility(event) {
	    if (event) event.preventDefault();
	    $$invalidate('vis', vis = !vis);
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

		function argument_getText_binding(value, { arg }) {
			getArgFunctions[arg.name] = value;
			$$invalidate('getArgFunctions', getArgFunctions);
		}

		function type_getText_binding(value) {
			getTypeText = value;
			$$invalidate('getTypeText', getTypeText);
		}

		function div3_binding($$node, check) {
			formArea = $$node;
			$$invalidate('formArea', formArea);
		}

		function textarea0_binding($$node, check) {
			queryTextarea = $$node;
			$$invalidate('queryTextarea', queryTextarea);
		}

		function div5_binding($$node, check) {
			queryFrame = $$node;
			$$invalidate('queryFrame', queryFrame);
		}

		function textarea1_binding($$node, check) {
			variablesTextarea = $$node;
			$$invalidate('variablesTextarea', variablesTextarea);
		}

		function div8_binding($$node, check) {
			variablesFrame = $$node;
			$$invalidate('variablesFrame', variablesFrame);
		}

		function form_1_binding($$node, check) {
			form = $$node;
			$$invalidate('form', form);
		}

		function div16_binding($$node, check) {
			responseArea = $$node;
			$$invalidate('responseArea', responseArea);
		}

		function textarea2_binding($$node, check) {
			evalTextarea = $$node;
			$$invalidate('evalTextarea', evalTextarea);
		}

		function div19_binding($$node, check) {
			evalFrame = $$node;
			$$invalidate('evalFrame', evalFrame);
		}

		$$self.$set = $$props => {
			if ('urlElement' in $$props) $$invalidate('urlElement', urlElement = $$props.urlElement);
			if ('credentialsElement' in $$props) $$invalidate('credentialsElement', credentialsElement = $$props.credentialsElement);
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('node' in $$props) $$invalidate('node', node = $$props.node);
			if ('operation' in $$props) $$invalidate('operation', operation = $$props.operation);
			if ('test' in $$props) $$invalidate('test', test = $$props.test);
		};

		$$self.$$.update = ($$dirty = { node: 1 }) => {
			if ($$dirty.node) { {
	            console.log("node changed -------------");
	            // generateQuery(node)
	            
	        } }
		};

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
			variablesTextarea,
			queryTextarea,
			queryFrame,
			variablesFrame,
			evalFrame,
			getTypeText,
			getArgFunctions,
			generateQuery,
			submitForm,
			evaluate,
			incChangeCounter,
			toggleVisibility,
			form,
			formArea,
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
		};
	}

	class Func extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, ["urlElement", "credentialsElement", "parentid", "scheme", "node", "operation", "test"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.urlElement === undefined && !('urlElement' in props)) {
				console.warn("<Func> was created without expected prop 'urlElement'");
			}
			if (ctx.credentialsElement === undefined && !('credentialsElement' in props)) {
				console.warn("<Func> was created without expected prop 'credentialsElement'");
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

	/* src/List.svelte generated by Svelte v3.4.0 */

	const file$6 = "src/List.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.t = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.e = list[i];
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.e = list[i];
		return child_ctx;
	}

	// (62:5) {#each queries as e (e.name)}
	function create_each_block_2(key_1, ctx) {
		var div, updating_test, current;

		function func_test_binding(value) {
			ctx.func_test_binding.call(null, value, ctx);
			updating_test = true;
			add_flush_callback(() => updating_test = false);
		}

		let func_props = {
			credentialsElement: ctx.credentialsElement,
			urlElement: ctx.urlElement,
			node: ctx.e,
			operation: "query",
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-query"
		};
		if (ctx.testFunctions[ctx.e.name] !== void 0) {
			func_props.test = ctx.testFunctions[ctx.e.name];
		}
		var func = new Func({ props: func_props, $$inline: true });

		add_binding_callback(() => bind(func, 'test', func_test_binding));

		return {
			key: key_1,

			first: null,

			c: function create() {
				div = element("div");
				func.$$.fragment.c();
				add_location(div, file$6, 62, 10, 1304);
				this.first = div;
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(func, div, null);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var func_changes = {};
				if (changed.credentialsElement) func_changes.credentialsElement = ctx.credentialsElement;
				if (changed.urlElement) func_changes.urlElement = ctx.urlElement;
				if (changed.queries) func_changes.node = ctx.e;
				if (changed.scheme) func_changes.scheme = ctx.scheme;
				if (changed.parentid) func_changes.parentid = "" + ctx.parentid + "-query";
				if (!updating_test && changed.testFunctions || changed.queries) {
					func_changes.test = ctx.testFunctions[ctx.e.name];
				}
				func.$set(func_changes);
			},

			i: function intro(local) {
				if (current) return;
				func.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				func.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				func.$destroy();
			}
		};
	}

	// (72:5) {#each mutations as e (e.name)}
	function create_each_block_1(key_1, ctx) {
		var div, updating_test, current;

		function func_test_binding_1(value) {
			ctx.func_test_binding_1.call(null, value, ctx);
			updating_test = true;
			add_flush_callback(() => updating_test = false);
		}

		let func_props = {
			credentialsElement: ctx.credentialsElement,
			urlElement: ctx.urlElement,
			node: ctx.e,
			operation: "mutation",
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-mutation"
		};
		if (ctx.testFunctions[ctx.e.name] !== void 0) {
			func_props.test = ctx.testFunctions[ctx.e.name];
		}
		var func = new Func({ props: func_props, $$inline: true });

		add_binding_callback(() => bind(func, 'test', func_test_binding_1));

		return {
			key: key_1,

			first: null,

			c: function create() {
				div = element("div");
				func.$$.fragment.c();
				add_location(div, file$6, 72, 10, 1697);
				this.first = div;
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(func, div, null);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var func_changes = {};
				if (changed.credentialsElement) func_changes.credentialsElement = ctx.credentialsElement;
				if (changed.urlElement) func_changes.urlElement = ctx.urlElement;
				if (changed.mutations) func_changes.node = ctx.e;
				if (changed.scheme) func_changes.scheme = ctx.scheme;
				if (changed.parentid) func_changes.parentid = "" + ctx.parentid + "-mutation";
				if (!updating_test && changed.testFunctions || changed.mutations) {
					func_changes.test = ctx.testFunctions[ctx.e.name];
				}
				func.$set(func_changes);
			},

			i: function intro(local) {
				if (current) return;
				func.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				func.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				func.$destroy();
			}
		};
	}

	// (82:5) {#each usertypes as t}
	function create_each_block$2(ctx) {
		var div, t, current;

		var type = new Type({
			props: {
			showCheckbox: false,
			typeName: ctx.t.name,
			scheme: ctx.scheme,
			parentid: "" + ctx.parentid + "-usertypes"
		},
			$$inline: true
		});

		return {
			c: function create() {
				div = element("div");
				type.$$.fragment.c();
				t = space();
				add_location(div, file$6, 82, 10, 2088);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(type, div, null);
				append(div, t);
				current = true;
			},

			p: function update(changed, ctx) {
				var type_changes = {};
				if (changed.usertypes) type_changes.typeName = ctx.t.name;
				if (changed.scheme) type_changes.scheme = ctx.scheme;
				if (changed.parentid) type_changes.parentid = "" + ctx.parentid + "-usertypes";
				type.$set(type_changes);
			},

			i: function intro(local) {
				if (current) return;
				type.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				type.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				type.$destroy();
			}
		};
	}

	function create_fragment$6(ctx) {
		var div, h40, t1, each_blocks_2 = [], each0_lookup = new Map(), t2, h41, t4, each_blocks_1 = [], each1_lookup = new Map(), t5, h42, t7, current;

		var each_value_2 = ctx.queries;

		const get_key = ctx => ctx.e.name;

		for (var i = 0; i < each_value_2.length; i += 1) {
			let child_ctx = get_each_context_2(ctx, each_value_2, i);
			let key = get_key(child_ctx);
			each0_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
		}

		var each_value_1 = ctx.mutations;

		const get_key_1 = ctx => ctx.e.name;

		for (var i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1(ctx, each_value_1, i);
			let key = get_key_1(child_ctx);
			each1_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
		}

		var each_value = ctx.usertypes;

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
				h40 = element("h4");
				h40.textContent = "Queries";
				t1 = space();

				for (i = 0; i < each_blocks_2.length; i += 1) each_blocks_2[i].c();

				t2 = space();
				h41 = element("h4");
				h41.textContent = "Mutations";
				t4 = space();

				for (i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].c();

				t5 = space();
				h42 = element("h4");
				h42.textContent = "User types";
				t7 = space();

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				add_location(h40, file$6, 60, 5, 1242);
				add_location(h41, file$6, 70, 5, 1631);
				add_location(h42, file$6, 80, 5, 2030);
				div.className = "svelte-12z8bpo";
				toggle_class(div, "noscheme", ctx.noscheme);
				add_location(div, file$6, 58, 0, 1148);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, h40);
				append(div, t1);

				for (i = 0; i < each_blocks_2.length; i += 1) each_blocks_2[i].m(div, null);

				append(div, t2);
				append(div, h41);
				append(div, t4);

				for (i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].m(div, null);

				append(div, t5);
				append(div, h42);
				append(div, t7);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				const each_value_2 = ctx.queries;

				group_outros();
				each_blocks_2 = update_keyed_each(each_blocks_2, changed, get_key, 1, ctx, each_value_2, each0_lookup, div, outro_and_destroy_block, create_each_block_2, t2, get_each_context_2);
				check_outros();

				const each_value_1 = ctx.mutations;

				group_outros();
				each_blocks_1 = update_keyed_each(each_blocks_1, changed, get_key_1, 1, ctx, each_value_1, each1_lookup, div, outro_and_destroy_block, create_each_block_1, t5, get_each_context_1);
				check_outros();

				if (changed.usertypes || changed.scheme || changed.parentid) {
					each_value = ctx.usertypes;

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

				if (changed.noscheme) {
					toggle_class(div, "noscheme", ctx.noscheme);
				}
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value_2.length; i += 1) each_blocks_2[i].i();

				for (var i = 0; i < each_value_1.length; i += 1) each_blocks_1[i].i();

				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				for (i = 0; i < each_blocks_2.length; i += 1) each_blocks_2[i].o();

				for (i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].o();

				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				for (i = 0; i < each_blocks_2.length; i += 1) each_blocks_2[i].d();

				for (i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].d();

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function compareTypes(t1, t2) {     
	 if (t1.name > t2.name ){
	      return 1
	 } else if (t1.name < t2.name) {
	      return -1
	 } 
	 return 0
	}

	function instance$6($$self, $$props, $$invalidate) {
		

	let { scheme, urlElement, credentialsElement, parentid = '', doTests = function (){
	    for (let [key,f] of Object.entries(testFunctions) )  f();
	} } = $$props;


	let mutations =[];
	let queries =[];
	let types=[];
	let usertypes=[];
	let noscheme = true;
	let testFunctions = {};

		function func_test_binding(value, { e }) {
			testFunctions[e.name] = value;
			$$invalidate('testFunctions', testFunctions);
		}

		function func_test_binding_1(value, { e }) {
			testFunctions[e.name] = value;
			$$invalidate('testFunctions', testFunctions);
		}

		$$self.$set = $$props => {
			if ('scheme' in $$props) $$invalidate('scheme', scheme = $$props.scheme);
			if ('urlElement' in $$props) $$invalidate('urlElement', urlElement = $$props.urlElement);
			if ('credentialsElement' in $$props) $$invalidate('credentialsElement', credentialsElement = $$props.credentialsElement);
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('doTests' in $$props) $$invalidate('doTests', doTests = $$props.doTests);
		};

		$$self.$$.update = ($$dirty = { scheme: 1 }) => {
			if ($$dirty.scheme) { {
	            // console.log("List scheme changed")
	            $$invalidate('mutations', mutations =[]);
	            $$invalidate('queries', queries =[]);
	            $$invalidate('types', types=[]);
	            $$invalidate('usertypes', usertypes=[]);
	        
	            try {
	            $$invalidate('noscheme', noscheme = Object.entries(scheme).length == 0);
	            $$invalidate('mutations', mutations = scheme.data.__schema.mutationType.fields);
	            $$invalidate('queries', queries = scheme.data.__schema.queryType.fields);
	            $$invalidate('types', types = scheme.data.__schema.types.sort(compareTypes));
	            $$invalidate('usertypes', usertypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind == 'OBJECT' && t.name != 'Query' && t.name != 'Mutation').sort(compareTypes));
	            } catch(e){}
	        } }
		};

		return {
			scheme,
			urlElement,
			credentialsElement,
			parentid,
			doTests,
			mutations,
			queries,
			usertypes,
			noscheme,
			testFunctions,
			func_test_binding,
			func_test_binding_1
		};
	}

	class List extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, ["scheme", "urlElement", "credentialsElement", "parentid", "doTests"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.scheme === undefined && !('scheme' in props)) {
				console.warn("<List> was created without expected prop 'scheme'");
			}
			if (ctx.urlElement === undefined && !('urlElement' in props)) {
				console.warn("<List> was created without expected prop 'urlElement'");
			}
			if (ctx.credentialsElement === undefined && !('credentialsElement' in props)) {
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

	/* src/App.svelte generated by Svelte v3.4.0 */

	const file$7 = "src/App.svelte";

	function create_fragment$7(ctx) {
		var div4, div3, div0, t1, div1, updating_credentialsElement, updating_urlElement, updating_scheme, t2, input, t3, div2, updating_doTests, current, dispose;

		function schemer_credentialsElement_binding(value) {
			ctx.schemer_credentialsElement_binding.call(null, value);
			updating_credentialsElement = true;
			add_flush_callback(() => updating_credentialsElement = false);
		}

		function schemer_urlElement_binding(value_1) {
			ctx.schemer_urlElement_binding.call(null, value_1);
			updating_urlElement = true;
			add_flush_callback(() => updating_urlElement = false);
		}

		function schemer_scheme_binding(value_2) {
			ctx.schemer_scheme_binding.call(null, value_2);
			updating_scheme = true;
			add_flush_callback(() => updating_scheme = false);
		}

		let schemer_props = {
			parentid: "" + ctx.parentid + "-Schemer"
		};
		if (ctx.credentialsElement !== void 0) {
			schemer_props.credentialsElement = ctx.credentialsElement;
		}
		if (ctx.urlElement !== void 0) {
			schemer_props.urlElement = ctx.urlElement;
		}
		if (ctx.scheme !== void 0) {
			schemer_props.scheme = ctx.scheme;
		}
		var schemer = new Schemer({ props: schemer_props, $$inline: true });

		add_binding_callback(() => ctx.schemer_binding(schemer));
		add_binding_callback(() => bind(schemer, 'credentialsElement', schemer_credentialsElement_binding));
		add_binding_callback(() => bind(schemer, 'urlElement', schemer_urlElement_binding));
		add_binding_callback(() => bind(schemer, 'scheme', schemer_scheme_binding));
		schemer.$on("clear", ctx.clearStorageItemScheme);

		function list_doTests_binding(value_3) {
			ctx.list_doTests_binding.call(null, value_3);
			updating_doTests = true;
			add_flush_callback(() => updating_doTests = false);
		}

		let list_props = {
			parentid: "" + ctx.parentid + "-List",
			credentialsElement: ctx.credentialsElement,
			urlElement: ctx.urlElement,
			scheme: ctx.scheme
		};
		if (ctx.doTests !== void 0) {
			list_props.doTests = ctx.doTests;
		}
		var list = new List({ props: list_props, $$inline: true });

		add_binding_callback(() => bind(list, 'doTests', list_doTests_binding));

		return {
			c: function create() {
				div4 = element("div");
				div3 = element("div");
				div0 = element("div");
				div0.textContent = "Enter GraphQL endpoint. For example https://yoursite.com/graphql";
				t1 = space();
				div1 = element("div");
				schemer.$$.fragment.c();
				t2 = space();
				input = element("input");
				t3 = space();
				div2 = element("div");
				list.$$.fragment.c();
				div0.className = "smaller svelte-xun2ts";
				add_location(div0, file$7, 191, 8, 4177);
				attr(input, "type", "button");
				input.className = "button svelte-xun2ts";
				input.value = "run all tests";
				add_location(input, file$7, 194, 12, 4518);
				div1.className = "row svelte-xun2ts";
				add_location(div1, file$7, 192, 8, 4277);
				div2.className = "main";
				add_location(div2, file$7, 196, 8, 4623);
				div3.className = "root svelte-xun2ts";
				add_location(div3, file$7, 190, 4, 4149);
				div4.className = "hidden svelte-xun2ts";
				toggle_class(div4, "visible", ctx.visible);
				add_location(div4, file$7, 189, 0, 4110);
				dispose = listen(input, "click", ctx.doAllTests);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div3);
				append(div3, div0);
				append(div3, t1);
				append(div3, div1);
				mount_component(schemer, div1, null);
				append(div1, t2);
				append(div1, input);
				append(div3, t3);
				append(div3, div2);
				mount_component(list, div2, null);
				add_binding_callback(() => ctx.div2_binding(div2, null));
				current = true;
			},

			p: function update(changed, ctx) {
				var schemer_changes = {};
				if (changed.parentid) schemer_changes.parentid = "" + ctx.parentid + "-Schemer";
				if (!updating_credentialsElement && changed.credentialsElement) {
					schemer_changes.credentialsElement = ctx.credentialsElement;
				}
				if (!updating_urlElement && changed.urlElement) {
					schemer_changes.urlElement = ctx.urlElement;
				}
				if (!updating_scheme && changed.scheme) {
					schemer_changes.scheme = ctx.scheme;
				}
				schemer.$set(schemer_changes);

				var list_changes = {};
				if (changed.parentid) list_changes.parentid = "" + ctx.parentid + "-List";
				if (changed.credentialsElement) list_changes.credentialsElement = ctx.credentialsElement;
				if (changed.urlElement) list_changes.urlElement = ctx.urlElement;
				if (changed.scheme) list_changes.scheme = ctx.scheme;
				if (!updating_doTests && changed.doTests) {
					list_changes.doTests = ctx.doTests;
				}
				list.$set(list_changes);

				if (changed.items) {
					ctx.div2_binding(null, div2);
					ctx.div2_binding(div2, null);
				}

				if (changed.visible) {
					toggle_class(div4, "visible", ctx.visible);
				}
			},

			i: function intro(local) {
				if (current) return;
				schemer.$$.fragment.i(local);

				list.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				schemer.$$.fragment.o(local);
				list.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div4);
				}

				ctx.schemer_binding(null);

				schemer.$destroy();

				list.$destroy();

				ctx.div2_binding(null, div2);
				dispose();
			}
		};
	}

	function instance$7($$self, $$props, $$invalidate) {
		


	let { parentid ='tab1', visible = true, url ='' } = $$props;

	let urlElement;
	let credentialsElement;
	let schemerElement;

	let scheme = {};
	// let ignoreChanges = true
	let doTests;
	// let noscheme = true
	let mainArea;

	let controls;

	// $: {
	//     scheme = scheme
	//     // noscheme = Object.entries(scheme).length == 0
	//     console.log('App scheme changed', scheme)
	//     // ignoreChanges= true
	//     // delay(restoreInputs, 500)
	// }

	function doAllTests() {
	    doTests();
	}


	function getControlValuesByTagName(tag) {
	    let a =[];
	    if (!mainArea){
	        return a
	    }
	    let inps=mainArea.getElementsByTagName(tag);  
	    for (let inp of inps) {
	        let id = inp.getAttribute("id");
	        if (!id) continue
	        if (id[0]=='-') console.log(id); // check wrong ids
	        let type =  tag == 'textarea' ? 'textarea' :  inp.getAttribute("type");
	        let value = inp.value;
	        let checked = inp.checked;
	        a.push({ id: id, type:type, checked:checked, value:value });
	    }
	    return a    
	}


	function getControlValues() {
	    let inputs    = getControlValuesByTagName("input");
	    let textareas = getControlValuesByTagName("textarea");
	    return inputs.concat(textareas)
	}


	function restoreControlValues() {
	    if (!controls) return
	    let restored = 0;
	    for (let c of controls) {
	        let inp = document.getElementById(c.id);
	        if (!inp) {
	            // console.log("No input:")
	            continue
	        }
	        restored ++;
	        if (c.type == 'checkbox') {
	            inp.checked = c.checked;
	        } else {
	            inp.value = c.value;
	        }
	    }
	    console.log(restored, "condrols have been restored.");
	}


	function clearStorageItemScheme(){
	    localStorage.removeItem(parentid);
	    console.log('App: clearStorageItemScheme: ', parentid);
	}

	function reloadSchema() {
	    schemerElement.getSchema();
	}

	function saveInputs() {
	    let key = parentid;
	    let controls = getControlValues();
	    if (!controls || controls.length==0){
	        console.log("No controls");
	        return
	    }
	    let value = { 
	        url: urlElement.value,
	        credentials: credentialsElement.checked,
	        controls:controls,
	        scheme:scheme
	        };
	    let controlsStr = JSON.stringify(value);
	    localStorage.setItem(key, controlsStr);
	    console.log("saved: ", key, controlsStr.length );
	}


	function restoreInputs() {

	    let key = parentid;
	    let controlsStr = localStorage.getItem(key);
	    if (!controlsStr) return
	    let value = JSON.parse(controlsStr);
	    urlElement.value = value.url; $$invalidate('urlElement', urlElement), $$invalidate('url', url);
	    credentialsElement.checked = value.credentials; $$invalidate('credentialsElement', credentialsElement);
	    $$invalidate('scheme', scheme = value.scheme);
	    console.log("restored tab=", key, controlsStr.length );

	    $$invalidate('controls', controls = value.controls);
	}


	afterUpdate(() => {
	    console.log("afterUpdate parentid=", parentid);
	    restoreInputs();
	    setTimeout(restoreControlValues, 0);
	});

		function schemer_binding($$component) {
			schemerElement = $$component;
			$$invalidate('schemerElement', schemerElement);
		}

		function schemer_credentialsElement_binding(value) {
			credentialsElement = value;
			$$invalidate('credentialsElement', credentialsElement);
		}

		function schemer_urlElement_binding(value_1) {
			urlElement = value_1;
			$$invalidate('urlElement', urlElement), $$invalidate('url', url);
		}

		function schemer_scheme_binding(value_2) {
			scheme = value_2;
			$$invalidate('scheme', scheme);
		}

		function list_doTests_binding(value_3) {
			doTests = value_3;
			$$invalidate('doTests', doTests);
		}

		function div2_binding($$node, check) {
			mainArea = $$node;
			$$invalidate('mainArea', mainArea);
		}

		$$self.$set = $$props => {
			if ('parentid' in $$props) $$invalidate('parentid', parentid = $$props.parentid);
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
			if ('url' in $$props) $$invalidate('url', url = $$props.url);
		};

		$$self.$$.update = ($$dirty = { urlElement: 1, url: 1 }) => {
			if ($$dirty.urlElement || $$dirty.url) { if (urlElement) {
	            console.log("url=", url);
	            urlElement.value = url; $$invalidate('urlElement', urlElement), $$invalidate('url', url);
	        } }
		};

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
			doAllTests,
			clearStorageItemScheme,
			reloadSchema,
			saveInputs,
			restoreInputs,
			schemer_binding,
			schemer_credentialsElement_binding,
			schemer_urlElement_binding,
			schemer_scheme_binding,
			list_doTests_binding,
			div2_binding
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$7, create_fragment$7, safe_not_equal, ["parentid", "visible", "url", "reloadSchema", "saveInputs", "restoreInputs"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.reloadSchema === undefined && !('reloadSchema' in props)) {
				console.warn("<App> was created without expected prop 'reloadSchema'");
			}
			if (ctx.saveInputs === undefined && !('saveInputs' in props)) {
				console.warn("<App> was created without expected prop 'saveInputs'");
			}
			if (ctx.restoreInputs === undefined && !('restoreInputs' in props)) {
				console.warn("<App> was created without expected prop 'restoreInputs'");
			}
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
			return this.$$.ctx.reloadSchema;
		}

		set reloadSchema(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get saveInputs() {
			return this.$$.ctx.saveInputs;
		}

		set saveInputs(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get restoreInputs() {
			return this.$$.ctx.restoreInputs;
		}

		set restoreInputs(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Dialog.svelte generated by Svelte v3.4.0 */

	const file$8 = "src/Dialog.svelte";

	function create_fragment$8(ctx) {
		var div5, div4, div0, t1, div1, t2, div2, input_1, br, t3, div3, button0, t5, button1, dispose;

		return {
			c: function create() {
				div5 = element("div");
				div4 = element("div");
				div0 = element("div");
				div0.textContent = "×";
				t1 = space();
				div1 = element("div");
				t2 = space();
				div2 = element("div");
				input_1 = element("input");
				br = element("br");
				t3 = space();
				div3 = element("div");
				button0 = element("button");
				button0.textContent = "Cancel";
				t5 = space();
				button1 = element("button");
				button1.textContent = "Ok";
				div0.className = "close svelte-tpcynl";
				add_location(div0, file$8, 120, 4, 2379);
				div1.className = "message svelte-tpcynl";
				add_location(div1, file$8, 122, 4, 2443);
				input_1.className = "input svelte-tpcynl";
				input_1.value = "";
				add_location(input_1, file$8, 124, 8, 2527);
				add_location(br, file$8, 124, 75, 2594);
				div2.className = "input-row svelte-tpcynl";
				add_location(div2, file$8, 123, 4, 2495);
				button0.className = "svelte-tpcynl";
				add_location(button0, file$8, 127, 8, 2644);
				button1.className = "svelte-tpcynl";
				add_location(button1, file$8, 128, 8, 2698);
				div3.className = "buttons svelte-tpcynl";
				add_location(div3, file$8, 126, 4, 2614);
				div4.className = "modal-content svelte-tpcynl";
				attr(div4, "onclick", "event.stopPropagation()");
				add_location(div4, file$8, 119, 2, 2313);
				div5.className = "modal svelte-tpcynl";
				toggle_class(div5, "hidden", ctx.hidden);
				add_location(div5, file$8, 116, 0, 2230);

				dispose = [
					listen(div0, "click", ctx.hideDialog),
					listen(input_1, "keyup", ctx.onkeyup),
					listen(button0, "click", ctx.hideDialog),
					listen(button1, "click", ctx.okPressed),
					listen(div5, "click", ctx.hideDialog)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div4);
				append(div4, div0);
				append(div4, t1);
				append(div4, div1);
				add_binding_callback(() => ctx.div1_binding(div1, null));
				append(div4, t2);
				append(div4, div2);
				append(div2, input_1);
				add_binding_callback(() => ctx.input_1_binding(input_1, null));
				append(div2, br);
				append(div4, t3);
				append(div4, div3);
				append(div3, button0);
				append(div3, t5);
				append(div3, button1);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.div1_binding(null, div1);
					ctx.div1_binding(div1, null);
				}
				if (changed.items) {
					ctx.input_1_binding(null, input_1);
					ctx.input_1_binding(input_1, null);
				}

				if (changed.hidden) {
					toggle_class(div5, "hidden", ctx.hidden);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div5);
				}

				ctx.div1_binding(null, div1);
				ctx.input_1_binding(null, input_1);
				run_all(dispose);
			}
		};
	}

	function instance$8($$self, $$props, $$invalidate) {
		let hidden = true;
	let message; 
	let input; 
	let callback = null;

	function showDialog(text, value, callbackFunc) {
	    $$invalidate('callback', callback = callbackFunc);
	    message.innerText = text; $$invalidate('message', message);
	    input.value = value; $$invalidate('input', input);
	    $$invalidate('hidden', hidden = false);
	    setTimeout(()=>input.focus());
	}


	function hideDialog(){
	    $$invalidate('hidden', hidden = true);
	}

	function okPressed() {
	    hideDialog();
	    if (typeof callback == 'function')
	        callback(input.value);
	}

	function onkeyup(event) {
	    console.log(event.keyCode);
	    if (event.keyCode === 13) {
	        event.preventDefault();
	        okPressed();
	    } else if (event.keyCode === 27) {
	        event.preventDefault();
	        hideDialog();
	    }

	}

		function div1_binding($$node, check) {
			message = $$node;
			$$invalidate('message', message);
		}

		function input_1_binding($$node, check) {
			input = $$node;
			$$invalidate('input', input);
		}

		return {
			hidden,
			message,
			input,
			showDialog,
			hideDialog,
			okPressed,
			onkeyup,
			div1_binding,
			input_1_binding
		};
	}

	class Dialog extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$8, create_fragment$8, safe_not_equal, ["showDialog", "hideDialog"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.showDialog === undefined && !('showDialog' in props)) {
				console.warn("<Dialog> was created without expected prop 'showDialog'");
			}
			if (ctx.hideDialog === undefined && !('hideDialog' in props)) {
				console.warn("<Dialog> was created without expected prop 'hideDialog'");
			}
		}

		get showDialog() {
			return this.$$.ctx.showDialog;
		}

		set showDialog(value) {
			throw new Error("<Dialog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get hideDialog() {
			return this.$$.ctx.hideDialog;
		}

		set hideDialog(value) {
			throw new Error("<Dialog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/Tabs.svelte generated by Svelte v3.4.0 */

	const file$9 = "src/Tabs.svelte";

	function get_each_context$3(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.tab = list[i];
		return child_ctx;
	}

	// (301:4) {#each tabs as tab (tab.tabName)}
	function create_each_block$3(key_1, ctx) {
		var span1, t0_value = ctx.tab.tabName, t0, t1, span0, t2, span0_title_value, span0_data_tabname_value, t3, div, input0, input0_title_value, t4, input1, input1_title_value, span1_data_tabname_value, dispose;

		return {
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
				span0.className = "x svelte-m7qdnd";
				span0.title = span0_title_value = "delete " + ctx.tab.tabName + " tab";
				span0.dataset.tabname = span0_data_tabname_value = ctx.tab.tabName;
				add_location(span0, file$9, 302, 12, 7210);
				attr(input0, "type", "button");
				input0.className = "button-tiny svelte-m7qdnd";
				input0.title = input0_title_value = "Rename " + ctx.active.tabName + " tab";
				input0.value = "rename";
				add_location(input0, file$9, 304, 16, 7371);
				attr(input1, "type", "button");
				input1.className = "button-tiny svelte-m7qdnd";
				input1.title = input1_title_value = "Save " + ctx.active.tabName + " to a file";
				input1.value = "export";
				add_location(input1, file$9, 305, 16, 7501);
				div.className = "tabmenu svelte-m7qdnd";
				add_location(div, file$9, 303, 12, 7333);
				span1.className = "tab svelte-m7qdnd";
				span1.dataset.tabname = span1_data_tabname_value = ctx.tab.tabName;
				toggle_class(span1, "active", ctx.tab.tabName == ctx.active.tabName);
				add_location(span1, file$9, 301, 8, 7073);

				dispose = [
					listen(span0, "click", ctx.deleteTab),
					listen(input0, "click", ctx.renameTab),
					listen(input1, "click", ctx.exportTab),
					listen(span1, "click", ctx.activate)
				];

				this.first = span1;
			},

			m: function mount(target, anchor) {
				insert(target, span1, anchor);
				append(span1, t0);
				append(span1, t1);
				append(span1, span0);
				append(span0, t2);
				append(span1, t3);
				append(span1, div);
				append(div, input0);
				append(div, t4);
				append(div, input1);
			},

			p: function update(changed, ctx) {
				if ((changed.tabs) && t0_value !== (t0_value = ctx.tab.tabName)) {
					set_data(t0, t0_value);
				}

				if ((changed.tabs) && span0_title_value !== (span0_title_value = "delete " + ctx.tab.tabName + " tab")) {
					span0.title = span0_title_value;
				}

				if ((changed.tabs) && span0_data_tabname_value !== (span0_data_tabname_value = ctx.tab.tabName)) {
					span0.dataset.tabname = span0_data_tabname_value;
				}

				if ((changed.active) && input0_title_value !== (input0_title_value = "Rename " + ctx.active.tabName + " tab")) {
					input0.title = input0_title_value;
				}

				if ((changed.active) && input1_title_value !== (input1_title_value = "Save " + ctx.active.tabName + " to a file")) {
					input1.title = input1_title_value;
				}

				if ((changed.tabs) && span1_data_tabname_value !== (span1_data_tabname_value = ctx.tab.tabName)) {
					span1.dataset.tabname = span1_data_tabname_value;
				}

				if ((changed.tabs || changed.active)) {
					toggle_class(span1, "active", ctx.tab.tabName == ctx.active.tabName);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(span1);
				}

				run_all(dispose);
			}
		};
	}

	function create_fragment$9(ctx) {
		var div, t0, each_blocks = [], each_1_lookup = new Map(), t1, span0, t3, span1, t5, input, current, dispose;

		let dialog_1_props = {};
		var dialog_1 = new Dialog({ props: dialog_1_props, $$inline: true });

		add_binding_callback(() => ctx.dialog_1_binding(dialog_1));

		var each_value = ctx.tabs;

		const get_key = ctx => ctx.tab.tabName;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$3(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
		}

		return {
			c: function create() {
				div = element("div");
				dialog_1.$$.fragment.c();
				t0 = space();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();

				t1 = space();
				span0 = element("span");
				span0.textContent = "    ＋    ";
				t3 = space();
				span1 = element("span");
				span1.textContent = "import";
				t5 = space();
				input = element("input");
				span0.title = "Add a new tab";
				span0.className = "button-tiny svelte-m7qdnd";
				set_style(span0, "font-weight", "bold");
				add_location(span0, file$9, 311, 4, 7704);
				span1.title = "Import tab from a file";
				span1.className = "button-tiny svelte-m7qdnd";
				add_location(span1, file$9, 312, 4, 7854);
				input.id = "fileChooser";
				attr(input, "type", "file");
				set_style(input, "display", "none");
				add_location(input, file$9, 314, 4, 7971);
				div.className = "container svelte-m7qdnd";
				add_location(div, file$9, 298, 0, 6962);

				dispose = [
					listen(span0, "click", ctx.addTab),
					listen(span1, "click", importTab),
					listen(input, "change", ctx.openFile)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(dialog_1, div, null);
				append(div, t0);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(div, null);

				append(div, t1);
				append(div, span0);
				append(div, t3);
				append(div, span1);
				append(div, t5);
				append(div, input);
				current = true;
			},

			p: function update(changed, ctx) {
				var dialog_1_changes = {};
				dialog_1.$set(dialog_1_changes);

				const each_value = ctx.tabs;
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block$3, t1, get_each_context$3);
			},

			i: function intro(local) {
				if (current) return;
				dialog_1.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				dialog_1.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.dialog_1_binding(null);

				dialog_1.$destroy();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();

				run_all(dispose);
			}
		};
	}

	function getTabsFromLocalStorage() {
	 let tabs =[];
	 let keys = Object.keys(localStorage);
	 keys.sort();
	 for (let key of keys) {
	     let str = localStorage.getItem(key);
	     if (!str) continue
	     let value = JSON.parse(str);
	     // make a copy of string
	     tabs.push( 
	         {
	             tabName:key,
	             url:(' ' + value.url).slice(1),
	             scheme:value.scheme
	         });
	 }
	 return tabs
	}

	function fixLocalStorageData(controlsStr, tabName, newTabName) {
	 if (!controlsStr) return controlsStr
	 let val = JSON.parse(controlsStr);
	 if (!val) return controlsStr
	 if (!val.controls) return controlsStr

	 for (let c of val.controls) {
	     c.id = c.id.replace(tabName, newTabName);
	 }
	 // console.log(controls)

	 return JSON.stringify(val)
	}

	function importTab(){
	 document.getElementById('fileChooser').click();
	}

	function instance$9($$self, $$props, $$invalidate) {
		

	let { tabs = [], active } = $$props; 
	let dialog;

	const dispatch = createEventDispatcher();

	// let defaultTab = {
	//     tabName: "auth-proxy",
	//     url:"https://auth-proxy.rg.ru/schema",
	//     scheme: null
	// }


	function activate(e) {
	    let tabName = this.getAttribute("data-tabName");
	    $$invalidate('active', active = tabs.find( t => t.tabName == tabName ));
	}

	function addNewTab(tabName, url) {
	    let newTab = {tabName: tabName, url:url};
	    $$invalidate('tabs', tabs = [...tabs, newTab]);
	    $$invalidate('active', active = newTab);
	    dispatch('save', {tab: active} );
	}

	function addTab(){
	    dialog.showDialog("Enter a new tab name","new", onAddTabOk);
	}

	function onAddTabOk(tabName){
	    if (!tabName) return
	    if (tabs.some( tab =>  tabName == tab.tabName )){
	        dialog.showDialog(`"${tabName}" already exists. Please try again.`,tabName, onAddTabOk);
	        return
	    }
	    addNewTab(tabName, 'https://auth-proxy.rg.ru/graphql');
	}



	function setActiveTabByName(name) {
	    let ind = tabs.findIndex( t => t.tabName == name );
	    if (ind == -1) {
	        return
	    }
	    $$invalidate('active', active = tabs[ind]);
	}


	function deleteTabByName(tabName) {
	    let tabData = localStorage.getItem(tabName);
	    localStorage.removeItem(tabName);
	    $$invalidate('tabs', tabs = tabs.filter( t => t.tabName != tabName));
	    $$invalidate('active', active = tabs.length >0 ? tabs[0] : null);
	    return tabData
	}

	function deleteTab(){
	    let tabName = this.getAttribute("data-tabName");
	    deleteTabByName(tabName);
	}

	function exportTab() {
	    let tabName = this.parentElement.parentElement.getAttribute("data-tabName");
	    let fileContent = localStorage.getItem(tabName);

	    // save tab name into data
	    let data = JSON.parse(fileContent);
	    data.tabName = tabName;
	    let modifiedFileContent = JSON.stringify(data);


	    // var fileContent = JSON.stringify(active);
	    var bb = new Blob([modifiedFileContent], { type: 'text/plain' });
	    var a = document.createElement('a');
	    a.download = active.tabName+'.json';
	    a.href = window.URL.createObjectURL(bb);
	    a.click();    
	}


	function openFile(event) {
	    var input = event.target;
	    var reader = new FileReader();
	    reader.onload = function(){
	        importTabFromData(reader.result);
	    };
	    reader.readAsText(input.files[0]);
	}

	// importTabFromData creates a tab from erlier exported data
	function importTabFromData(text) {
	    if (!text) 
	        return
	    var newTab = JSON.parse(text);
	    if (!newTab)
	        return
	    var tabName = newTab.tabName;
	    if (!tabName) 
	        return

	    // save imported tab
	    localStorage.setItem(tabName,text);
	    
	    // restore tabs from local storage
	    let storedTabs = getTabsFromLocalStorage();
	    // tabs = storedTabs.length ==0 ? [defaultTab] : storedTabs
	    $$invalidate('tabs', tabs = storedTabs);
	    $$invalidate('active', active = newTab);
	}


	function renameTab(){
	    // create a new tab
	    let tabName = active.tabName;
	    let tabUrl = active.url;
	    let tabScheme = active.scheme;

	    let newTabName = tabName;
	    // while (tabs.includes(newTabName)){
	    while (tabs.some( tab =>  newTabName == tab.tabName )){
	        newTabName = prompt(`Rename "${newTabName}"`,newTabName);
	        if (!newTabName) return
	    }

	    // delete old tab
	    let data = deleteTabByName(tabName);

	   // add the new tab to UI, and activate it
	    if (!newTabName) return
	    let newTab = {
	        tabName:newTabName,
	        url:tabUrl,
	        scheme: tabScheme
	    };
	    $$invalidate('tabs', tabs = [...tabs, newTab]);
	    $$invalidate('active', active = newTab);

	    // move data 
	    if (data){
	        // it's not enough to save the old data by the new key,
	        // We need to fix all ids.
	        let fixedData = fixLocalStorageData(data, tabName, newTabName);
	        localStorage.setItem(newTabName,fixedData);
	    }
	}


	onMount(async () => {
	    let storedTabs = getTabsFromLocalStorage();
	    $$invalidate('tabs', tabs = storedTabs.length ==0 ? [] : storedTabs);
	    $$invalidate('active', active = tabs[0]);
	    dispatch('mounted');
	});

		function dialog_1_binding($$component) {
			dialog = $$component;
			$$invalidate('dialog', dialog);
		}

		$$self.$set = $$props => {
			if ('tabs' in $$props) $$invalidate('tabs', tabs = $$props.tabs);
			if ('active' in $$props) $$invalidate('active', active = $$props.active);
		};

		return {
			tabs,
			active,
			dialog,
			activate,
			addNewTab,
			addTab,
			setActiveTabByName,
			deleteTab,
			exportTab,
			openFile,
			renameTab,
			dialog_1_binding
		};
	}

	class Tabs extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$9, create_fragment$9, safe_not_equal, ["tabs", "active", "addNewTab", "setActiveTabByName"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.active === undefined && !('active' in props)) {
				console.warn("<Tabs> was created without expected prop 'active'");
			}
			if (ctx.addNewTab === undefined && !('addNewTab' in props)) {
				console.warn("<Tabs> was created without expected prop 'addNewTab'");
			}
			if (ctx.setActiveTabByName === undefined && !('setActiveTabByName' in props)) {
				console.warn("<Tabs> was created without expected prop 'setActiveTabByName'");
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
			return this.$$.ctx.addNewTab;
		}

		set addNewTab(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get setActiveTabByName() {
			return this.$$.ctx.setActiveTabByName;
		}

		set setActiveTabByName(value) {
			throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/AppTabbed.svelte generated by Svelte v3.4.0 */

	const file$a = "src/AppTabbed.svelte";

	function get_each_context$4(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.tab = list[i];
		return child_ctx;
	}

	// (124:4) {#each tabs as tab (tab.tabName)}
	function create_each_block$4(key_1, ctx) {
		var first, updating_saveInputs, updating_reloadSchema, current;

		function app_saveInputs_binding(value) {
			ctx.app_saveInputs_binding.call(null, value, ctx);
			updating_saveInputs = true;
			add_flush_callback(() => updating_saveInputs = false);
		}

		function app_reloadSchema_binding(value_1) {
			ctx.app_reloadSchema_binding.call(null, value_1, ctx);
			updating_reloadSchema = true;
			add_flush_callback(() => updating_reloadSchema = false);
		}

		let app_props = {
			parentid: ctx.tab.tabName,
			url: ctx.tab.url,
			visible: ctx.tab.tabName == ctx.active.tabName
		};
		if (ctx.tabsSaveFunctions[ctx.tab.tabName] !== void 0) {
			app_props.saveInputs = ctx.tabsSaveFunctions[ctx.tab.tabName];
		}
		if (ctx.tabsReloadFunctions[ctx.tab.tabName] !== void 0) {
			app_props.reloadSchema = ctx.tabsReloadFunctions[ctx.tab.tabName];
		}
		var app = new App({ props: app_props, $$inline: true });

		add_binding_callback(() => bind(app, 'saveInputs', app_saveInputs_binding));
		add_binding_callback(() => bind(app, 'reloadSchema', app_reloadSchema_binding));

		return {
			key: key_1,

			first: null,

			c: function create() {
				first = empty();
				app.$$.fragment.c();
				this.first = first;
			},

			m: function mount(target, anchor) {
				insert(target, first, anchor);
				mount_component(app, target, anchor);
				current = true;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				var app_changes = {};
				if (changed.tabs) app_changes.parentid = ctx.tab.tabName;
				if (changed.tabs) app_changes.url = ctx.tab.url;
				if (changed.tabs || changed.active) app_changes.visible = ctx.tab.tabName == ctx.active.tabName;
				if (!updating_saveInputs && changed.tabsSaveFunctions || changed.tabs) {
					app_changes.saveInputs = ctx.tabsSaveFunctions[ctx.tab.tabName];
				}
				if (!updating_reloadSchema && changed.tabsReloadFunctions || changed.tabs) {
					app_changes.reloadSchema = ctx.tabsReloadFunctions[ctx.tab.tabName];
				}
				app.$set(app_changes);
			},

			i: function intro(local) {
				if (current) return;
				app.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				app.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(first);
				}

				app.$destroy(detaching);
			}
		};
	}

	function create_fragment$a(ctx) {
		var div, updating_tabs, updating_active, t, each_blocks = [], each_1_lookup = new Map(), current;

		function tabs_1_tabs_binding(value) {
			ctx.tabs_1_tabs_binding.call(null, value);
			updating_tabs = true;
			add_flush_callback(() => updating_tabs = false);
		}

		function tabs_1_active_binding(value_1) {
			ctx.tabs_1_active_binding.call(null, value_1);
			updating_active = true;
			add_flush_callback(() => updating_active = false);
		}

		let tabs_1_props = {};
		if (ctx.tabs !== void 0) {
			tabs_1_props.tabs = ctx.tabs;
		}
		if (ctx.active !== void 0) {
			tabs_1_props.active = ctx.active;
		}
		var tabs_1 = new Tabs({ props: tabs_1_props, $$inline: true });

		add_binding_callback(() => ctx.tabs_1_binding(tabs_1));
		add_binding_callback(() => bind(tabs_1, 'tabs', tabs_1_tabs_binding));
		add_binding_callback(() => bind(tabs_1, 'active', tabs_1_active_binding));
		tabs_1.$on("save", ctx.saveTab);
		tabs_1.$on("mounted", ctx.onTabsMounted);

		var each_value = ctx.tabs;

		const get_key = ctx => ctx.tab.tabName;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$4(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
		}

		return {
			c: function create() {
				div = element("div");
				tabs_1.$$.fragment.c();
				t = space();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();
				div.className = "apptabbed";
				add_location(div, file$a, 121, 0, 2655);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(tabs_1, div, null);
				append(div, t);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(div, null);

				current = true;
			},

			p: function update(changed, ctx) {
				var tabs_1_changes = {};
				if (!updating_tabs && changed.tabs) {
					tabs_1_changes.tabs = ctx.tabs;
				}
				if (!updating_active && changed.active) {
					tabs_1_changes.active = ctx.active;
				}
				tabs_1.$set(tabs_1_changes);

				const each_value = ctx.tabs;

				group_outros();
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
				check_outros();
			},

			i: function intro(local) {
				if (current) return;
				tabs_1.$$.fragment.i(local);

				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				tabs_1.$$.fragment.o(local);

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].o();

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				ctx.tabs_1_binding(null);

				tabs_1.$destroy();

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();
			}
		};
	}

	function instance$a($$self, $$props, $$invalidate) {
		

	let tabsElement;
	let tabs = [];
	let active; 
	let tabsSaveFunctions = {};
	let tabsReloadFunctions = {};

	const unsubscribe = changeCount.subscribe(value => {
	    console.log("From AppTabbed changeCount=", value);
	    delayAndSave();
	});


	function saveTab() {
	    if (!active)
	        return
	    if (!active.tabName)
	        return    
	    if (!tabsSaveFunctions[active.tabName])   
	        return 
	    tabsSaveFunctions[active.tabName]();
	    console.log("SAVED");
	}

	function reloadActiveTab() {
	    console.log('reloadActiveTab');
	    if (!active)
	        return
	    if (!active.tabName)
	        return    
	    if (!tabsReloadFunctions[active.tabName])   
	        return 
	    tabsReloadFunctions[active.tabName]();
	    console.log("RELOADED");
	}

	var reloadTimeout;
	function delayAndReload(){
	    console.log('delayAndReload');
	    clearTimeout(reloadTimeout);
	    $$invalidate('reloadTimeout', reloadTimeout = setTimeout(reloadActiveTab, 1000));    
	}


	var saveTimeout;
	function delayAndSave(){
	    clearTimeout(saveTimeout);
	    $$invalidate('saveTimeout', saveTimeout = setTimeout(saveTab, 1000));
	}


	function getTab(name) {
	    let i = tabs.findIndex( t => t.tabName == name );
	    if (i == -1) {
	        return null
	    }
	    return tabs[i]
	}


	function createOrActivateTab(){
	    console.log("AppTabbed createOrActivateTab");

	    let urlParams = new URLSearchParams(window.location.search);
	    var endPoint = urlParams.get('end_point');
	    var tabName = urlParams.get('tab_name');
	    if (!endPoint || !tabName) return
	    console.log(tabName, endPoint);
	    console.log(tabs);
	    
	    let tab = getTab(tabName); 

	    // if there is no such tab
	    // create a new one, activate it and reload schema
	    if (!tab) {
	        tabsElement.addNewTab(tabName, endPoint);
	        delayAndReload();
	        return
	    }

	    // if tabName and url are the same activate the tab
	    if (tab.tabName == tabName && tab.url == endPoint) {
	        tabsElement.setActiveTabByName( tabName);
	        delayAndReload();
	        return
	    }

	    // if tabName is the same but urls is different create a new tab
	    if (tab.tabName == tabName && tab.url!=endPoint){

	        let newTabName = tabName;
	        for (let i=1; i<100; i++){
	            newTabName = tabName + i;
	            if (! getTab(newTabName)){
	                tabsElement.addNewTab(newTabName, endPoint);
	                delayAndReload();
	                return                
	            }
	        }
	        alert("can not create a new tab: "+ tabName);
	        return
	    }



	}


	function onTabsMounted(e){
	    createOrActivateTab();
	}

		function tabs_1_binding($$component) {
			tabsElement = $$component;
			$$invalidate('tabsElement', tabsElement);
		}

		function tabs_1_tabs_binding(value) {
			tabs = value;
			$$invalidate('tabs', tabs);
		}

		function tabs_1_active_binding(value_1) {
			active = value_1;
			$$invalidate('active', active);
		}

		function app_saveInputs_binding(value, { tab }) {
			tabsSaveFunctions[tab.tabName] = value;
			$$invalidate('tabsSaveFunctions', tabsSaveFunctions);
		}

		function app_reloadSchema_binding(value_1, { tab }) {
			tabsReloadFunctions[tab.tabName] = value_1;
			$$invalidate('tabsReloadFunctions', tabsReloadFunctions);
		}

		return {
			tabsElement,
			tabs,
			active,
			tabsSaveFunctions,
			tabsReloadFunctions,
			saveTab,
			onTabsMounted,
			tabs_1_binding,
			tabs_1_tabs_binding,
			tabs_1_active_binding,
			app_saveInputs_binding,
			app_reloadSchema_binding
		};
	}

	class AppTabbed extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$a, create_fragment$a, safe_not_equal, []);
		}
	}

	// import App from './App.svelte';


	var app = new AppTabbed({
		target: document.getElementById('graphql-test') ? document.getElementById('graphql-test') : document.body
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map
