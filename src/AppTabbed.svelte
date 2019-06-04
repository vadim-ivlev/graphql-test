<script>
import App from "./App.svelte"
import Tabs from "./Tabs.svelte"

let tabs = []
let active = ''
let tabsSaveFunctions = {}


function saveTab(params) {
    tabsSaveFunctions[active]()
}

</script>

<style>

</style>

<div>
    <Tabs bind:tabs bind:active on:save={saveTab}/>
    {#each tabs as tab (tab)}
    <!-- {@debug tabs} -->
        <App parentid={tab} visible={tab == active} bind:saveInputs={tabsSaveFunctions[tab]}/>
    {/each}

</div>