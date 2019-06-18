<script>

// import { onMount } from 'svelte'
import { queryString } from "./schemer.js"
import JsonView from '../JsonView.svelte'

export let url = "http://localhost:7700/graphql"
export let scheme = {}
export let parentid =''
export let refreshScheme = getScheme
export let urlElement 


// let methodElement 
let visible = false

async function getScheme() {
    scheme = {}    
    // scheme =  await $.ajax({ url: inputUrl.value, type: "POST", data: { query:queryString, variables: '{}'},});
    try {
        let resp = await fetch(urlElement.value, { method: "POST", body: JSON.stringify({ query: queryString, variables: "{}" }) })
        scheme = await resp.json()
    } catch (error) {
        alert(error)
    }
}

// function clearScheme() {
//     scheme = {}     
// }

// function onChange(params) {
//     url = this.value
//     console.log("schemer onChange parentid=", parentid)
//     console.log("url=", url)
// }

// onMount(async () => {
//     // getScheme()
// })

</script>

<style>
    .self {
        /* background-color: whitesmoke; */
    }

    .post {
        width: 50px;
        font-size: 100%;
        display: none;
    }
    .text {
        width: 300px;
        font-size: 100%;
    }
    .button {
        /* font-family: 'Roboto Condensed'; */
        /* font-weight: bold; */
        /* letter-spacing: 0.1em; */
        padding: 2px 10px 2px 10px;
        border: 1px solid steelblue;
        border-radius: 2px;
        background-color: transparent;
        color: steelblue;
        font-size: 100%;
    }

    label {
        margin-left:0;
    }
    
</style>


<div class="self">
  <form>
    <!-- <input class="post" type="text" id="id-{parentid}-inp-method" value="POST" bind:this={methodElement}> -->
    <label for="id-{parentid}-inp-url" >GraphQL endpoint</label>
    <input class="text" type="text" id="id-{parentid}-inp-url" name="id-{parentid}-inp-url" bind:this={urlElement} value={url} />
    <!-- on:change -->
    <!-- bind:value={url} -->
    <!-- <input type="button" value="reset" on:click={clearScheme} /> -->
    <input type="button" class="button" value="&#x21bb; reload scheme" on:click={getScheme} />
    {#if Object.entries(scheme).length != 0 }
    <br>
    <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} scheme</a>
    {/if}
  </form>
  {#if visible}
        <JsonView json={scheme} />
  {/if}
</div>
