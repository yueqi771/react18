import { ContinousEventPriority, DefaultEventPriority, DiscreteEventPriority, getCurrentUpdatePriority, setCurrentUpdatePriority } from "react-reconciler/src/ReactEventPriorities";
import { getClosesInstanceFromNode } from "../client/ReactDOMComponentTree";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";
import { getEventTarget } from "./getEventTarget";

export function createEventListenerWrapperWithPrioity(
  targetContainer, domEventName, eventSystemFlags
) {
  const listenerWrapper = dispatchDiscretEvent;
  return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer)
}

/**
 * 派发离散的事件的监听函数s
 * @param {*} domEventName 
 * @param {*} eventSystemFlags 阶段， 0 冒泡， 4 捕获
 * @param {*} container  容器div# root
 * @param {*} nativeEvent 原生的事件
 */
function dispatchDiscretEvent(domEventName, eventSystemFlags, container, nativeEvent) {
  // 在你是点击按钮的时候，需要设置更新的优先级
  // 先获取当老的更新优先级
  const previousPriority = getCurrentUpdatePriority();

  try {
    // 把当前的更新优先级设置为离散事件优先级 1
    setCurrentUpdatePriority(DiscreteEventPriority)
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent)
  } finally {
    setCurrentUpdatePriority(previousPriority)
  }
  
}

/**
 * 此方法就是委托给容器的回调，当容器的#root触发事件的时候会触发此函数
 * @param {*} domEventName 
 * @param {*} eventSystemFlags 
 * @param {*} container 
 * @param {*} nativeEvents 
 */
export function dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent) {
  // 获取事件源
  const nativeEventTarget = getEventTarget(nativeEvent);

  const targetIns =  getClosesInstanceFromNode(nativeEventTarget);

  dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, targetIns, container)
}

/**
 * 获取事件优先级
 * @param {domEvent} 事件的名称 
 */
export function getEventPriority(domEventName) {
  switch(domEventName) {
    case 'click':
      return DiscreteEvent;
    case 'drag':
      return ContinousEventPriority;
    default:
      return DefaultEventPriority; 
  }
}