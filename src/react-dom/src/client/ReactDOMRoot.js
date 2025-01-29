import { listenToAllSupportedEvents } from 'react-dom-bindings/src/events/DOMPluginEventSystem';
import { createContainer, updateContainer } from 'react-reconciler/src/ReactFiberReconciler'


export function createRoot(container) { 
  const root = createContainer(container);

  return new ReactDOMRoot(root)
}


function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot
}

ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot;
  // 合成事件是一开始就绑定的
  listenToAllSupportedEvents(root.containerInfo)
  updateContainer(children, root)
}

