import ReactSharedInternals from "./ReactSharedInternals";

const { ReactCurrentDispatcher }  = ReactSharedInternals

/**
 * 
 * @param {*} reducer 处理器，用户根据老状态和动作计算新状态
 * @param {*} initialArg 初始参数
 */
export function useReducer(reducer, initialArg) {
  // 派发器
  const dispatcher = resolveDispatcher();

  return dispatcher.useReducer(reducer, initialArg)
}


export function useState(reducer, initialArg) {
  // 派发器
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(reducer, initialArg)
}

export function useEffect(create, deps) {
  // 派发器
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps)
}

export function useLayoutEffect(create, deps) {
  // 派发器
  const dispatcher = resolveDispatcher();
  return dispatcher.useLayoutEffect(create, deps)
}



function resolveDispatcher() {
  return ReactCurrentDispatcher.current;
}