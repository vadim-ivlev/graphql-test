<script>
import App from "./App.svelte"
import Tabs from "./Tabs.svelte"
import { changeCount } from './stores.js'

let tabsElement
let tabs = []
let active 
let tabsSaveFunctions = {}

const unsubscribe = changeCount.subscribe(value => {
    delayAndSave()
    // console.log("From AppTabbed changeCount=", value)
});


function saveTab() {
    if (!active)
        return
    if (!active.tabName)
        return    
    if (!tabsSaveFunctions[active.tabName])   
        return 
    tabsSaveFunctions[active.tabName]()
    console.log("SAVED")
}

var saveTimeout
function delayAndSave(){
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveTab, 1000)
}


function getTab(name) {
    let i = tabs.findIndex( t => t.tabName == name )
    if (i == -1) {
        return null
    }
    return tabs[i]
}


function createOrActivateTab(){
    console.log("AppTabbed createOrActivateTab")

    let urlParams = new URLSearchParams(window.location.search)
    var endPoint = urlParams.get('end_point')
    var tabName = urlParams.get('tab_name')
    if (!endPoint || !tabName) return
    console.log(tabName, endPoint)
    console.log(tabs)
    
    let tab = getTab(tabName) 

    // if there is no such tab
    // create a new one, activate it and reload schema
    if (!tab) {
       tabsElement.addNewTab(tabName, endPoint)

       // TODO: reload schema
       // activeApp.reloadSchema() 

       return
    }

    // if tabName and url are the same activate the tab
    if (tab.tabName == tabName && tab.url == endPoint) {
        tabsElement.setActiveTabByName( tabName)
        return
    }

    // if tabName is the same but urls is different create a new tab
    if (tab.tabName == tabName && tab.url!=endPoint){

        let newTabName = tabName
        for (let i=1; i<100; i++){
            newTabName = tabName + i
            if (! getTab(newTabName)){
                tabsElement.addNewTab(newTabName, endPoint)
                return                
            }
        }
        alert("can not create a new tab: "+ tabName)
        return
    }



}


function onTabsMounted(e){
    createOrActivateTab()
}



</script>

<style>

</style>

<div>
    <Tabs bind:this={tabsElement} bind:tabs bind:active on:save={saveTab} on:mounted={onTabsMounted} />
    {#each tabs as tab (tab.tabName)}
    <!-- {@debug tabs} -->
        <App parentid={tab.tabName} url={tab.url} visible={tab.tabName == active.tabName} bind:saveInputs={tabsSaveFunctions[tab.tabName]}/>
    {/each}

</div>