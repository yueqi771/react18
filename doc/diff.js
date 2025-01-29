let existingChildren = new Map();

existingChildren.set('B', 'B_Fiber');
existingChildren.set('C', 'C_Fiber');
existingChildren.set('D', 'D_Fiber');
existingChildren.set('E', 'E_Fiber');
existingChildren.set('F', 'F_Fiber');

// 上一个放置好的索引
let lastPlaceIndex = 0;

let newChildren = ["C", "E", "B", "G", "D"];

for(let i = 0; i < newChildren.length; i++) {
  let newChild = newChildren[i];
  let exit = existingChildren.get(newChild);

  if(exit) {
    // 复用C
    existingChildren.delete(newChild)
  }
}

