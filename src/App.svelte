<script>
    import Schemer from "./schemer/schemer.svelte";
    import JsonView from "./JsonView.svelte"
    import List from "./List.svelte"

    let url
    let scheme = {}
    let controls = []

  
    function getControls() {
        var a =[]
        var inps=document.getElementsByTagName("input")  
        for (let n of inps) {
            let id = n.getAttribute("id")
            let type = n.getAttribute("type")
            let value = n.value
            let checked = n.checked
            if (id !== null) {
                if (id[0]=='-') console.log(id)
                // if (checked !== null ) console.log("not null:", checked, id)
                a.push({ id: id, type:type, checked:checked, value:value })
            }
        }
        return a
    }


    function saveFields(params) {
        controls = getControls()
        console.log(controls.length, controls.reduce( (sum, o) => sum + o.id.length  , 0) )
    }

    function restoreFields(params) {
        console.log(controls)
    }


</script>

<div class="">
    <input type="button" on:click={saveFields} value="save">
    <input type="button" on:click={restoreFields} value="restore">
</div>
<Schemer bind:url bind:schema={scheme} />
<List {scheme} />

<!-- <JsonView json={scheme}/> -->
