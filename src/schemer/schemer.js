
var schema = {};
const queryString = `
query IntrospectionQuery {
    __schema {
      queryType {
        ...FullType
      }
      mutationType {
        name
      }
      subscriptionType {
        name
      }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }
  
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }
  
  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }
  
  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
  

`


export async function getSchema() {
    var url0 = document.getElementById('inp0').value

    // schema =  await $.ajax({ url: url0, type: "POST", data: { query:queryString, variables: '{}'},});   

    var resp = await fetch(url0, { method: 'POST', body: JSON.stringify({ query: queryString, variables: '{}' }), })
    schema = await resp.json()

    $('#schema').jsonViewer(schema, { collapsed: true, rootCollapsable: false })
    // $('#schema').text(JSON.stringify(schema, null,'  '));

}

// export { getSchema }; 

