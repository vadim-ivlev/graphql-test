<script>
import App from "./App.svelte"
import Tabs from "./Tabs.svelte"

let tabs = []
let active 
let tabsSaveFunctions = {}


function saveTab(params) {
    tabsSaveFunctions[active.tabName]()
}

</script>

<style>

</style>

<div>
    <Tabs bind:tabs bind:active on:save={saveTab}/>
    {#each tabs as tab (tab.tabName)}
    <!-- {@debug tabs} -->
        <App parentid={tab.tabName} visible={tab.tabName == active.tabName} bind:saveInputs={tabsSaveFunctions[tab.tabName]}/>
    {/each}

</div>