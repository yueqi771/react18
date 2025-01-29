import { setValueForStyles } from './CSSpropertyOerations'
import { setTextContent } from './setTextContent';
import { setValueForProperty } from './DOMPropertyOperations'

const STYLE = 'style';
const CHILDREN = 'children'

export function setInitialProperties(domElement, tag, props) {
  setInitialDOMProperties(tag, domElement, props)
}

export function diffProperties(domElement, tag, lastProps, nextProps) {
  let updatePayload = null;
  let propKey;
  let styleName;
  let styleUpdates = null;

  // 删除的过程
  // 处理属性的删除， 如果一个属性在老对象里面有，在新对象里面没有，意味着删除
  for(propKey in lastProps) {
    // 如果新属性里面有此属性，或者老的没有此属性或者老的是个null
    if(nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey) || lastProps[propKey] === null) {
      continue;
    }

    if(propKey === STYLE) {
      const lastStyle = lastProps[propKey];

      for(styleName in lastStyle) {
        if(lastStyle.hasOwnProperty(styleName)) {
          if(!styleUpdates) {
            styleUpdates = {}
          }

          styleUpdates[styleName] = ''
        }
      }
    }else {
      (updatePayload = updatePayload || []).push(propKey, null)
    }
  }


  for (propKey in nextProps) {
    const nextProp = nextProps[propKey]; // 老属性的值
    const lastProp = lastProps !== null ? lastProps[propKey] : undefined; // 新属性的值

    if(!nextProps.hasOwnProperty(propKey) || nextProp === lastProp || (nextProp === null && lastProp === null)) {
      continue
    }

    if(propKey === STYLE) {
      if(lastProp) {
        // 计算要删除的行样式
        for(styleName in lastProp) {
          // 如果样式对象里面在老的里面有，但是新的里面没有，那么删除
          if(lastProp.hasOwnProperty(styleName) && (!nextProp || !nextProp.hasOwnProperty(styleName))) {
            if(!styleUpdates) styleUpdates = {};
            styleUpdates[styleName] = ''
          }
        }

        for(styleName in nextProp) {
          // 如果新的属性中有，并且新的根老的的值不一样
          if(nextProp.hasOwnProperty(styleName && lastProp[styleName] !== nextProp[styleName])) {
            if(!styleUpdates) styleUpdates = {};

            styleUpdates[styleName] = nextProp[styleName]
          }
        }
      }else {
        styleUpdates = nextProp;
      }
    }else if(propKey === CHILDREN){
      if(typeof nextProp === 'string' || typeof nextProp === 'number') {
        (updatePayload = updatePayload || []).push(propKey, nextProp)
      }
    }else {
      (updatePayload = updatePayload || []).push(propKey, nextProp)
    }
  }

  if(styleUpdates ){
    (updatePayload = updatePayload || []).push(STYLE, styleUpdates)
  }

  return updatePayload
}

function setInitialDOMProperties(tag, domElement, nextProps) {
  for(const propKey in nextProps) {
    if(nextProps.hasOwnProperty(propKey)) {
      const nextProp = nextProps[propKey]
      if(propKey === STYLE) {
        setValueForStyles(domElement, nextProp)
      }else if(propKey === CHILDREN) {
        if(typeof nextProp === 'string') {
          setTextContent(domElement, nextProp)
        }else if(typeof nextProp === 'number') {
          setTextContent(domElement, nextProp + '')
        }
      }else if(nextProp !== null) {
        setValueForProperty(domElement, propKey, nextProp)
      }
    }
  }
}

export function updateProperties(domElement, updatePayload, type, oldProps, newProps) {
  updateDOMProperties(domElement, updatePayload);
}

function updateDOMProperties(domElement, updatePayload) {
  for(let i = 0; i < updatePayload.length; i+=2) {
    const propKey = updatePayload[i];
    const propValue = updatePayload[i+1];

    if(propKey === STYLE) {
      setValueForStyles(domElement, propValue)
    }else if(propKey === CHILDREN) {
      setTextContent(domElement, propValue)
    }else {
      setValueForProperty(domElement, propKey, propValue)
    }
  }

}