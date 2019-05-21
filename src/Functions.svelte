<script>
export let scheme 

let mutations =[]
let queries =[]
let usertypes=[]
let scalartypes =[]
let objecttypes =[]




$: try {
    console.log("--------------")
    console.log(scheme)
    mutations = scheme.data.__schema.mutationType.fields
    queries = scheme.data.__schema.queryType.fields
    console.log(queries)
    // usertypes = scheme.data.__schema.types
    usertypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind == 'OBJECT' && t.name != 'Query' && t.name != 'Mutation')
    console.log(usertypes)
    // scalartypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind != 'OBJECT' )
    // console.log(scalartypes)
    } catch(e){}


</script>


<h4>Queries</h4>
{#each queries as e}
     <div>{e.name}()</div>
{/each}

<h4>Mutations</h4>
{#each mutations as e}
     <div>{e.name}()</div>
{/each}

<h4>User types</h4>
{#each usertypes as e}
     <div>{e.name}</div>
{/each}

<!-- <h4>Scalar types</h4>
{#each scalartypes as e}
     <div>{e.name}</div>
{/each} -->
