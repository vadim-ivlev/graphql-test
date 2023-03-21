
<script>

export let json

let elem

$: try {
        window.$(elem).jsonViewer(json, { collapsed: true, rootCollapsable: false })
    } catch (error) {}


</script>

<style>
.self {
    border: 1px solid silver;
    background-color: whitesmoke;
}
</style>



<div class="self" bind:this={elem}></div>

