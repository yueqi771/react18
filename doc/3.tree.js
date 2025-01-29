let root = {
  name: "A1",
  children: [
    {
      name: "B",
      children: [
        { name: "B1" },
        { name: "B2" }
      ]
    },
    {
      name: "C",
      children: [
        { name: "C1" },
        { name: "C2" }
      ]
    }
  ]
}

function bfs(node){
  const stack = [node];

  let current

  while(current = stack.shift()) {
    console.log(current.name)
    current.children?.forEach(child => {
      stack.push(child)
    })

  }
}

bfs(root)

/** 
function dfs(node) {
  console.log(node.name)

  if(node.children) {
    node.children.forEach((item) => {
      dfs(item)
    })
  }
}

dfs(root)

*/