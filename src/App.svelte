<script>
    import Schemer from './schemer/schemer.svelte'
    import JsonView from './JsonView.svelte'
    import List from './List.svelte'

    let url
    let scheme = {}
</script>


<Schemer bind:url={url} bind:schema={scheme} />
<List scheme={scheme}/>


<!-- <JsonView json={scheme}/> -->
