import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import hasOwnProperty from "shared/hasOwnProperty";

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true
}

function ReactElement(type, key, ref, props) {
  // 这就是react元素， 也就是虚拟DOM
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref, // 是用来获取真实的dom元素的
    props
  }
}

export function jsxDEV(type, config, maybeKey) {
  let propName; // 属性名
  const props = {}; // 属性对象
  let key = null; // 每个虚拟dom都有一个可选的key属性，用来区分一个富杰殿下的不同子节点 
  let ref = null; // 引用，后面可以通过这个实现获取真实DOM的需求
  
  if(typeof maybeKey !== undefined || hasValidKey(config)) {
    key = maybeKey
  }

  if(hasValidRef(config)) {
    ref = config.ref
  }

  for(propName in config) {
    if(hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
      props[propName] = config[propName]
    }
  }

  return ReactElement(type, key, ref, props)
}

function hasValidKey(config) {
  return config.key !== undefined
}

function hasValidRef(config) {
  return config.ref !== undefined
}