<script>
import App from "./App.svelte"
import Tabs from "./Tabs.svelte"
import { changeCount } from './stores.js'

let tabs = []
let active 
let tabsSaveFunctions = {}

const unsubscribe = changeCount.subscribe(value => {
    delayAndSave()
    // console.log("From AppTabbed changeCount=", value)
});


function saveTab() {
    tabsSaveFunctions[active.tabName]()
    console.log("SAVED")
}

var saveTimeout
function delayAndSave(){
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveTab, 1000)
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