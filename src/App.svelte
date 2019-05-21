<script>
    // import {a,aaa} from './scr';
    // aaa(a);
    import Schemer from './schemer/schemer.svelte'


	let m = { x: 0, y: 0 };
</script>

<style>
	div { width: 100%; height: 100%; }
</style>

<Schemer/>







<!-- 
<div on:mousemove={e => m = { x: e.clientX, y: e.clientY }}>
	The mouse position is {m.x} x {m.y}
</div> -->
