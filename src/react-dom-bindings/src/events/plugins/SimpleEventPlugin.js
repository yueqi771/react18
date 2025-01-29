import { registerSimpleEvents, topLevelEventsToReactNames } from '../DOMEventProperties'
import { accumulateSinglePhaseListeners } from '../DOMPluginEventSystem';
import { IS_CAPTURE_PHASE } from '../EventSystemFlags'
import { SyntheticMouseEvent } from '../SyntheticEvent';

// 找到回调函数，放到queue数组中
/**
 * 把要执行的回调函数添加到dispatchQueue里面
 * @param {*} dispatchQueue 
 * @param {*} domEventName 
 * @param {*} targetInst 
 * @param {*} nativeEvent 
 * @param {*} eventSystemFlags 
 * @param {*} targetContainer 
 */
export function extractEvent(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  // 判断是否时捕获阶段
  const isCapturePhase = (eventSystemFlags &  IS_CAPTURE_PHASE) !== 0; 
  // 获取react事件名
  const reactName  = topLevelEventsToReactNames.get(domEventName)
  // 合成事件构造函数
  let SyntheticEventCtor;

  switch(domEventName){
    case 'click':
      SyntheticEventCtor = SyntheticMouseEvent;
      break;
    default: 
      break;
  }

  // 累加单个节点的监听
  const listeners = accumulateSinglePhaseListeners(
    targetInst,
    reactName,
    nativeEvent.type,
    isCapturePhase
  )

  // 如果有要执行的监听函数的话[onCLickCapture, onClick]
  // 合成事件主要是参数和执行对象
  if(listeners) {
    const event = new SyntheticEventCtor(
      reactName, 
      domEventName, 
      null, 
      nativeEvent, 
      nativeEventTarget
    )

    dispatchQueue.push({
      event, // 合成事件的实例
      listeners
    })
  }
  console.log('listenere----', listeners, dispatchQueue)
}


export { registerSimpleEvents as registerEvents }