<script>
import {createEventDispatcher,onMount} from 'svelte'


export let tabs = []
export let active 

const dispatch = createEventDispatcher()

let defaultTab = {
    tabName: "auth-proxy",
    url:"https://auth-proxy.rg.ru/schema",
    scheme: null
}


function activate(e) {
    let tabName = this.getAttribute("data-tabName")
    active = tabs.find( t => t.tabName == tabName )
}

function getTabsFromLocalStorage() {
    let tabs =[]
    let keys = Object.keys(localStorage)
    keys.sort()
    for (let key of keys) {
        let str = localStorage.getItem(key)
        if (!str) continue
        let value = JSON.parse(str)
        // make a copy of string
        tabs.push( 
            {
                tabName:key,
                url:(' ' + value.url).slice(1),
                scheme:value.scheme
            })
    }
    return tabs
}



function addTab(){
    let tabName = prompt("Enter a new tab name","")
    if (!tabName) return
    // while (tabs.includes(tabName)){
    while (tabs.some( tab =>  tabName == tab.tabName )){
        tabName = prompt(`"${tabName}" already exists. Please try again.`,tabName)
        if (!tabName) return
    }
    let newTab = {tabName: tabName, url:''}
    tabs = [...tabs, newTab]
    active = newTab
    saveTab()
}


function deleteTabByName(tabName) {
    let tabData = localStorage.getItem(tabName)
    localStorage.removeItem(tabName)
    tabs = tabs.filter( t => t.tabName != tabName)
    active = tabs.length >0 ? tabs[0] : null
    return tabData
}

function deleteTab(){
    let tabName = this.getAttribute("data-tabName")
    deleteTabByName(tabName)
}

// fixLocalStorageData renames ids by chnaging tabName to newTabName
function fixLocalStorageData(controlsStr, tabName, newTabName) {
    if (!controlsStr) return controlsStr
    let val = JSON.parse(controlsStr)
    if (!val) return controlsStr
    if (!val.controls) return controlsStr

    for (let c of val.controls) {
        c.id = c.id.replace(tabName, newTabName)
    }
    // console.log(controls)

    return JSON.stringify(val)
}

function exportTab() {
    let tabName = this.parentElement.parentElement.getAttribute("data-tabName")
    let fileContent = localStorage.getItem(tabName)

    // save tab name into data
    let data = JSON.parse(fileContent)
    data.tabName = tabName
    let modifiedFileContent = JSON.stringify(data)


    // var fileContent = JSON.stringify(active);
    var bb = new Blob([modifiedFileContent], { type: 'text/plain' });
    var a = document.createElement('a');
    a.download = active.tabName+'.json';
    a.href = window.URL.createObjectURL(bb);
    a.click();    
}

function importTab(){
    document.getElementById('fileChooser').click()
}


function openFile(event) {
    var input = event.target;
    var reader = new FileReader();
    reader.onload = function(){
        importTabFromData(reader.result)
    }
    reader.readAsText(input.files[0])
}

// importTabFromData creates a tab from erlier exported data
function importTabFromData(text) {
    if (!text) 
        return
    var newTab = JSON.parse(text)
    if (!newTab)
        return
    var tabName = newTab.tabName
    if (!tabName) 
        return


    // delete old tab with the same name
    // deleteTabByName(tabName)

    
    // attach imported tab and activate it
    // tabs = [...tabs, newTab]
    // active = newTab

    // delete newTab["tabName"]
    // save imported tab
    localStorage.setItem(tabName,text)
    
    // restore tabs from local storage
    let storedTabs = getTabsFromLocalStorage()
    tabs = storedTabs.length ==0 ? [defaultTab] : storedTabs
    active = newTab


}


function renameTab(){
    // create a new tab
    let tabName = active.tabName
    let tabUrl = active.url
    let tabScheme = active.scheme

    let newTabName = tabName
    // while (tabs.includes(newTabName)){
    while (tabs.some( tab =>  newTabName == tab.tabName )){
        newTabName = prompt(`Rename "${newTabName}"`,newTabName)
        if (!newTabName) return
    }

    // delete old tab
    let data = deleteTabByName(tabName)

   // add the new tab to UI, and activate it
    if (!newTabName) return
    let newTab = {
        tabName:newTabName,
        url:tabUrl,
        scheme: tabScheme
    }
    tabs = [...tabs, newTab]
    active = newTab

    // move data 
    if (data){
        // it's not enough to save the old data by the new key,
        // We need to fix all ids.
        let fixedData = fixLocalStorageData(data, tabName, newTabName)
        localStorage.setItem(newTabName,fixedData)
    }
}


function saveTab(){
    dispatch('save', {tab: active} )
}

onMount(async () => {
    let storedTabs = getTabsFromLocalStorage()
    // tabs = storedTabs.length ==0 ? [defaultTab] : [...tabs, ...storedTabs]
    tabs = storedTabs.length ==0 ? [] : storedTabs
    active = tabs[0]
})


</script>

<style>
    .container {
        padding: 10px 0 0 0;
        /* background-color: whitesmoke; */
        border-bottom:1px solid silver;
        margin-bottom:30px;
    }

    .tab-dimmed {
        color:steelblue;
        font-size: 90%;
        cursor: pointer;
        padding-left: 10px;
        padding-right: 10px;

        border-radius: 3px 3px 0 0;
        border:1px solid rgba(192, 192, 192, 0.685);
        border-bottom: 1px solid white;        
        border-top-width: 2px;
        border-top-color: rgba(192, 192, 192, 0.682);
        opacity: 0.5;
     }
    .tab-dimmed:hover {
        background-color: rgba(0,0,0,0.05);
        opacity: 1.0;
    }


    .tab {
        margin: 0;
        display: inline-block;
        padding: 1px 4px 1px 20px;
        cursor: default;
    
        /* color: steelblue; */
        color: gray;
        border-radius: 3px 3px 0 0;
        border:1px solid transparent;
        border-top-width: 2px;

        top: 1px;
        position: relative;
    }

    .tab:hover {
        background-color: rgba(0,0,0,0.05)
    }

    .active {
        /* display: inline-block;
        padding: 5px 20px 5px 20px;
        cursor: pointer; */

        background-color: white;

        border:1px solid silver;
        border-top-width: 2px;
        border-bottom: 1px solid white;        
        /* border-top-color: steelblue; */
        border-top-color: #E10098;

        color: black;
        }

    .active:hover {
        background-color: transparent;
    }

    .active .x {
        color: black;
    }

    .x {
        padding:0 3px 0 3px;
        font-size: 90%;
        margin-left:3px;
        color: gray;
    }
    .x:hover {
        color: #E10098;
    }

    .buttons {
        /* float: right; */
        margin-left:20px;
    }
    .button-tiny {
        padding: 0 3px 0 3px;
        border: 1px solid transparent;
        border-radius: 4px;
        background-color: transparent;
        color: #E10098;
        font-size: 14px;
        cursor: pointer;
        border-radius: 20px;
    }
    .button-tiny:hover {
        border: 1px solid #E10098;
    }

    .tabmenu {
        /* border: 1px solid black; */
        position: absolute;
        top: 25px;
        /* font-size: 70%; */
        width: 100%;
        left:0;
        text-align: center;
        display:none;
        word-wrap: none;
        white-space: nowrap;
        

    }
    .active .tabmenu {
        display: block;
    }

</style>

<div class="container">

    {#each tabs as tab (tab.tabName)}
        <span class="tab" class:active={tab.tabName == active.tabName} data-tabName={tab.tabName} on:click={activate}>{tab.tabName} 
            <span class="x" title="delete {tab.tabName} tab" data-tabName={tab.tabName} on:click={deleteTab}>&#xd7;</span>
            <div class="tabmenu">
                <input type="button" class="button-tiny" title="Rename {active.tabName} tab" value="rename" on:click={renameTab}>
                <input type="button" class="button-tiny" title="Save {active.tabName} to a file" value="export&#8628;" on:click={exportTab}>
            </div>
        </span>
    {/each}
    <!-- {#if tabs && tabs.length > 0}
    <span class="buttons">
        <input type="button" class="button" title="rename {active.tabName} tab" value="rename" on:click={renameTab}>
        <input type="button" class="button" title="save {active.tabName} tab" value="save tab" on:click={saveTab}> 
    </span>
    {/if} -->
    <span title="Add a new tab" class="button-tiny" style="font-weight:bold;" on:click={addTab}>&nbsp;&nbsp;&nbsp; &#xFF0B; &nbsp;&nbsp;&nbsp;</span>
    <span title="Import tab from a file" class="button-tiny" on:click={importTab}>import&#8624;</span>
    <input id="fileChooser" type='file' style="display:none" on:change={openFile} >
</div> 
<!-- &#x21ca; &#x21c8; &#x2297;  -->