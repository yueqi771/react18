import { diffProperties, setInitialProperties, updateProperties } from './ReactDOMComponent'
import { precacheFiberNode, updateFiberProps } from './ReactDOMComponentTree';

export function shouldSetTextContent(type, props) {
  return typeof props.children === 'string' || typeof props.children === 'number'
}

export function createTextInstance(content) {
  return document.createTextNode(content)
}

export function createInstance(type, props, internalInstanceHandler) {
  const domElement = document.createElement(type);

  precacheFiberNode(internalInstanceHandler, domElement)
  // 把属性直接保存到domElement上
  updateFiberProps(domElement, props)

  return domElement;
}


export function prepareUpdate(dom, type, oldProps, newProps) {
  return diffProperties(dom, type, oldProps, newProps)
}

export function commitUpdate(domElement, updatePayload, type, oldProps, newProps) {
  updateProperties(domElement, updatePayload, type, oldProps, newProps);

  updateFiberProps(domElement, newProps)
}

export function removeChild(parentInstane, child) {
  parentInstane.removeChild(child)
}

/**
 * 挂载我们的心节点
 * @param {*} parent 
 * @param {*} workInProgress 
 */
export function finalizeInitialChildren(domElement, type, props, hostContext) {
  setInitialProperties(domElement, type, props)
}

/**
 * 
 * @param {*} parent 
 * @param {*} child 
 */
export function appendInitialChild(parent, child) {
  parent.appendChild(child)
}

export function appendChild(parent, child) {
  parent.appendChild(child)
}

export function insertBefore(parent, child, beforeChild) {
  parent.insertBefore(child, beforeChild)
}