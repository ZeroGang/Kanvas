/** 避免 router ↔ saved 循环依赖：延后绑定实际 switchPage */
let _go = () => {};

export function bindNavigate(fn) {
  _go = fn;
}

export function navigate(pageId) {
  _go(pageId);
}
