// react 进行 dom diff的时候会计算要执行的操作；

let Placement = 0b001; // 1
const Update = 0b010 // 2

let flags = 0b00;

// 增加操作

flags |= Placement // 0b001
flags |= Update // 0b011

console.log(flags)

// 删除操作
falgs = flags & ~Placement; 

// 是否包含
