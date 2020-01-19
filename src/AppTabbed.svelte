<script>
import { onMount } from 'svelte'
import App from "./App.svelte"
import Tabs from "./Tabs.svelte"
import { changeCount } from './stores.js'

let tabsElement
let tabs = []
let active 
let tabsSaveFunctions = {}
// let tabsRestoreFunctions = {}
let tabsReloadFunctions = {}

const unsubscribe = changeCount.subscribe(value => {
    console.log("From AppTabbed changeCount=", value)
    if (value > 0)
        delayAndSave()
})


// function restoreSchemerValues(event) {
    // var tabName = event.detail
    // let controlsStr = localStorage.getItem(tabName)
    // if (!controlsStr) return
    // let value = JSON.parse(controlsStr)

    // console.log("restoreSchemerValues", tabName, active)

    // active.url = value.url
    // active.credentials = value.credentials

    // // urlElement.value = value.url
    // // credentialsElement.checked = value.credentials
    // // scheme = value.scheme
    // // console.log("restored tab:", tabName, "controlsStr.length=", controlsStr.length, value )

    // // controls = value.controls
// }


function saveActiveTab() {
    if (!active)
        return
    if (!active.tabName)
        return    
    if (!tabsSaveFunctions[active.tabName])   
        return 
    tabsSaveFunctions[active.tabName]()
    console.log("SAVED")
}


// function restoreActiveTab(active) {
//     if (!active)
//         return
//     if (!active.tabName)
//         return    
//     if (!tabsRestoreFunctions[active.tabName])   
//         return 
//     tabsRestoreFunctions[active.tabName](active.tabName)
//     console.log("RESTORED")
// }




function reloadActiveTab() {
    console.log('reloadActiveTab')
    if (!active)
        return
    if (!active.tabName)
        return    
    if (!tabsReloadFunctions[active.tabName])   
        return 
    tabsReloadFunctions[active.tabName]()
    console.log("RELOADED")
}

var reloadTimeout
function delayAndReload(){
    console.log('delayAndReload')
    clearTimeout(reloadTimeout)
    reloadTimeout = setTimeout(reloadActiveTab, 1000)    
}


var saveTimeout
function delayAndSave(){
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(saveActiveTab, 1000)
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
       delayAndReload()
       return
    }

    // if tabName and url are the same activate the tab
    if (tab.tabName == tabName && tab.url == endPoint) {
        tabsElement.setActiveTabByName( tabName)
        delayAndReload()
        return
    }

    // if tabName is the same but urls is different create a new tab
    if (tab.tabName == tabName && tab.url!=endPoint){

        let newTabName = tabName
        for (let i=1; i<100; i++){
            newTabName = tabName + i
            if (! getTab(newTabName)){
                tabsElement.addNewTab(newTabName, endPoint)
                delayAndReload()
                return                
            }
        }
        alert("can not create a new tab: "+ tabName)
        return
    }
}


// function onTabsMounted(e){
//     // FIXME: move it to onMounted
//     createOrActivateTab()
// }

onMount(async () => {
    // FIXME: moved it to onMounted
    createOrActivateTab()
    

})



</script>

<style>
</style>

<div class="apptabbed">
    <Tabs bind:this={tabsElement} bind:tabs bind:active on:newtab={delayAndSave}/>
    <!-- on:mounted={onTabsMounted} -->
    <!-- on:activate={restoreActiveTab} -->
    <!-- on:save={saveActiveTab} -->
    {#each tabs as tab (tab.tabName)}
    <!-- {@debug tabs} -->
        <App parentid={tab.tabName} 
            url={tab.url} 
            visible={tab.tabName == active.tabName} 
            bind:saveInputs={tabsSaveFunctions[tab.tabName]}
            bind:reloadSchema={tabsReloadFunctions[tab.tabName]}
        />
        <!-- bind:restoreInputs={tabsRestoreFunctions[tab.tabName]} -->
    {/each}

</div>