export function setValueForProperty(node, name, value) {
  if(value === null) {
    node.removeAttribute(name)
  }else if(name === '$$typeof'){

  } else  {
    node.setAttribute(name, value)
  }
}