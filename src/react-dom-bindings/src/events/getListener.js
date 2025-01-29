import { getFiberCurrentPropsFromNode } from "../client/ReactDOMComponentTree";

// 获取此fiber上对应的回调函数
export function getListener(instance, registrationName) {
  const { stateNode } = instance;

  if(stateNode == null) return null;

  const props = getFiberCurrentPropsFromNode(stateNode);

  if(props === null) return null;

  const listener = props[registrationName];

  return listener
}