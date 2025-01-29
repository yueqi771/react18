import { registerTwoPhaseEvent } from "./EventRegistry";

const simpleEventPluginEvents = ['click']

export const topLevelEventsToReactNames = new Map()
// 注册简单事件
export function registerSimpleEvents() {
  for(let i = 0; i< simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i];

    const domEventName = eventName.toLowerCase(); // click

    // 转化为首字母大写
    const capitalizeEvent  = eventName[0].toUpperCase() + eventName.slice(1);

    registerSimpleEvent(domEventName, `on${capitalizeEvent}`)
  }
}

function registerSimpleEvent(domEventName, reactName) {
  // 把原生事件名和处理函数的名字进行事件名和绑定
  topLevelEventsToReactNames.set(domEventName, reactName)
  registerTwoPhaseEvent(reactName, [domEventName]);
}