<script>
    import Schemer from './schemer/schemer.svelte'
    import JsonView from './JsonView.svelte'

    let url
    let scheme = {}
</script>


<Schemer bind:url={url} bind:schema={scheme} />



<!-- <JsonView json={scheme}/> -->
