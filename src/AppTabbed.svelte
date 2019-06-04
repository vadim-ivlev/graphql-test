<script>
import App from "./App.svelte"
import Tabs from "./Tabs.svelte"

let tabs = ["tab1"]
let active = 'tab1'

</script>

<style>

</style>

<div>
    <Tabs bind:tabs bind:active/>
    {#each tabs as tab (tab)}
        <App parentid={tab} visible={tab == active}/>
    {/each}

</div>