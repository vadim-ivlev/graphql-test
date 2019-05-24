<script>

import { onMount } from 'svelte'
import { queryString } from "./schemer.js"
import JsonView from '../JsonView.svelte'

export let url = "http://localhost:7777/graphql"
export let schema = {}
let visible = false


async function getSchema() {
// schema =  await $.ajax({ url: url, type: "POST", data: { query:queryString, variables: '{}'},});
let resp = await fetch(url, { method: "POST", body: JSON.stringify({ query: queryString, variables: "{}" }) })
schema = await resp.json()
}


onMount(async () => {
    getSchema()
})

</script>

<style>
    .self {
        background-color: whitesmoke;
    }
</style>


<div class="self">
  <form>
    <label for="inp0">GraphQL url</label>
    <input type="text" id="inp0" name="inp0" bind:value={url} />
    <input type="button" value="refresh" on:click={getSchema} />
    <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} schema</a>
  </form>
  {#if visible}
        <JsonView json={schema} />
  {/if}
</div>
