import { HostComponent } from "react-reconciler/src/ReactWorkTags";
import { addEventBubbleListener, addEventCaptureListener } from "./EventListener";
import { allNativeEvents } from "./EventRegistry"
import { IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { getEventTarget } from "./getEventTarget";
import * as SimpleEventPlugin from './plugins/SimpleEventPlugin';
import { createEventListenerWrapperWithPrioity } from "./ReactDomEventListener";
import { getListener } from "./getListener";

SimpleEventPlugin.registerEvents();

const listeningMarker = `_reactlistening` + Math.random().toString().slice(2); 

export function listenToAllSupportedEvents(rootContainerElement) {
  // 同类型的监听只有一次
  if(!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true;
     // 遍历所有的原生事件，进行绑定
    allNativeEvents.forEach((domEventName) => {
      // console.log('domEventName', domEventName)
      listenToNativeEvent(domEventName, true, rootContainerElement)
      listenToNativeEvent(domEventName, false, rootContainerElement);
    })
  }
}

/**
 * 注册原生事件
 * @param {*} domEventName 
 * @param {*} isCapturePhaseListener 
 * @param {*} target 
 */
export function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
  let eventSystemFlags = 0;  // 默认是0指的是冒泡

  if(isCapturePhaseListener) {
    eventSystemFlags |= IS_CAPTURE_PHASE;
  }

  addTrapperEventListener(target, domEventName, eventSystemFlags);
}

function addTrapperEventListener(
  targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener
) {
  const listener = createEventListenerWrapperWithPrioity(targetContainer, domEventName, eventSystemFlags);

  if(isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener);
  }else {
    addEventBubbleListener(targetContainer, domEventName, listener)
  }
}

export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst, 
  targetContainer
) {
  disptchEventForPlugins(domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst, 
    targetContainer)
}

function disptchEventForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst, 
  targetContainer) {
  const nativeEventTarget = getEventTarget(nativeEvent);

  // 派发事件的数组，不光自己，还有父亲和爷爷们
  const dispatchQueue = [];

  extractEvent(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )

  processDispatchQueue(dispatchQueue, eventSystemFlags)
}


function extractEvent(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  SimpleEventPlugin.extractEvent(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )
}

function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  // 判断是否在捕获阶段
  const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;

  for(let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i];
    // 按照顺序出发队列中的事件回调条目
    processDispatchQueueItemsInOrder(event, listeners, inCapturePhase)
  }

}

function processDispatchQueueItemsInOrder(event, dispatchListeners, inCapturePhase) {
  if(inCapturePhase) {
    for(let i = dispatchListeners.length - 1; i >=0; i--) {
      const { listener, currentTarget } = dispatchListeners[i];

      if(event.isPropagationStopped()) return

      executeDispatch(event, listener, currentTarget)
    }
  }else {
    for(let i = 0; i < dispatchListeners.length; i++) {
      const { listener, currentTarget } = dispatchListeners[i];

      if(event.isPropagationStopped()) return

      executeDispatch(event, listener, currentTarget)
    }
  }
}

function executeDispatch(event, listener, currentTarget) {
  event.currentTarget = currentTarget
  listener(event)
}

// 累加回调函数
export function accumulateSinglePhaseListeners(
  targetFiber, reactName, nativeEventType, isCapturePhase
) {
  const captureName = reactName + 'Capture';

  const reactEventName = isCapturePhase ? captureName : reactName;

  const listeners = [];

  let instance = targetFiber;

  while(instance !== null) {
    const { stateNode, tag } = instance;

    if(tag === HostComponent && stateNode !== null) {
      if(reactEventName !== null) {
        const listener = getListener(instance, reactEventName)

        if(listener) {
          listeners.push(createDispatchListener(instance, listener, stateNode));
        }
      }

    }
    instance = instance.return
  }

  return listeners
}


function createDispatchListener(instance, listener, currentTarget) {
  return {
    instance, listener, currentTarget
  }
}