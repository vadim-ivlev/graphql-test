<script>

export let tabs = ["tab1","tab2"]
export let active = "tab1"

let n = 3
function activate(e) {
    active = this.getAttribute("data-tab")
}

function addTab(){
    let tabName = "tab"+(n++)
    tabs = [...tabs, tabName]
    active = tabName
}

function deleteTab(){
    let tab = this.getAttribute("data-tab")
    tabs = tabs.filter( e => e != tab)
    active = tabs.length >0 ? tabs[0] : ''
    console.log(active)
}


</script>

<style>
    .container {
        padding: 10px 0 0 0;
        /* background-color: whitesmoke; */
    }
    .plus {
     }

    .tab {
        margin: 0;
        display: inline-block;
        padding: 5px 20px 5px 20px;
        cursor: default;
        border-bottom: 2px solid transparent;
        color: gray;
        /* background-color: transparent; */
    }

    .active {
        /* display: inline-block;
        padding: 5px 20px 5px 20px;
        cursor: pointer; */

        background-color: white;
        border-bottom-color: steelblue;
        color: black;
        }
    .x {
        border-radius: 20px;
        border: 1px solid transparent;
        display: inline-block;
        font-size: 70%;
        width:14px;
        height: 14px;
        text-align: center;
        vertical-align: bottom;
        margin-left:5px;
        background-color: transparent;
        font-weight: bold;
    }
    .x:hover {
        border-color: silver;
    }

</style>

<div class="container">
    {#each tabs as tab (tab)}
        <span class="tab" class:active={tab == active} data-tab={tab} on:click={activate}>{tab} 
            <span class="x" data-tab={tab} on:click={deleteTab}>x</span>
        </span>
    {/each}
    <span class="tab plus" on:click={addTab}>+</span>
</div>