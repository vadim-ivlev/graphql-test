<script>
    import Schemer from './schemer/schemer.svelte'
    import JsonView from './JsonView.svelte'
    import Functions from './Functions.svelte'

    let url
    let scheme = {}
</script>


<Schemer bind:url={url} bind:schema={scheme} />
<Functions scheme={scheme}/>


<!-- <JsonView json={scheme}/> -->
