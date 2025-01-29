
const randomKey = Math.random()/toString(36).slice(2);
const internalInstanceKey = '__reactFiber$' + randomKey
const internalPropsKey = '__reactProps$' + randomKey

// 从真实的DOM节点上获取它对应的fiber节点
export function getClosesInstanceFromNode(targeNode) {
  const targetInst = targeNode[internalInstanceKey]
  if(targetInst) return targetInst
  // 如果真实DOM上没有fiber， 不返回updefined, 二是要返回null
  return null
}

/**
 * 提前缓存fiber节点的实例到DOM节点上
 * @param {*} hostInst 
 * @param {*} node 
 */
export function precacheFiberNode(hostInst, node) {
  node[internalInstanceKey] = hostInst
}

export function updateFiberProps(node, props) {
  node[internalPropsKey] = props;
}

export function getFiberCurrentPropsFromNode(node) {
  return node[internalPropsKey] || null
}