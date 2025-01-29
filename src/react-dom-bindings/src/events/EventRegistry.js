export const allNativeEvents = new Set();

/**
 * 注册两个阶段的事件
 * @param {*} registrationName React事件名，onClick
 * @param {*} dependencies 原生事件数组[click]
 */
export function registerTwoPhaseEvent(registrationName, dependencies) {
  // 注册冒泡阶段事件
  registerDirectEvent(registrationName, dependencies);
  // 注册捕获阶段事件
  registerDirectEvent(registrationName + 'Capture', dependencies);
}

export function registerDirectEvent(registrationName, dependencies) {
  for(let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i])
  }
}