/**
 * ElementWrapper 和 TextWrapper 是基本单位
 * Component 是 ElementWrapper 和 TextWrapper 的集合
 */

const RENDER_TO_DOM = Symbol('render to dom');

class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }

  setAttribute(name, value) {
    if (name.match(/^on([\s\S]+)$/)) {
      let eventName = RegExp.$1;
      eventName = eventName.replace(/^([\s\S])/, (c) => c.toLowerCase());
      this.root.addEventListener(eventName, value);
    } else if (name === 'className') {
      this.root.setAttribute('class', value)
    }
    this.root.setAttribute(name, value);
  }

  appendChild(component) {
    const range = document.createRange();
    // 在 this._range 最后 append 新的 range (of component);
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    // 添加真实的dom
    component[RENDER_TO_DOM](range);
  }

  [RENDER_TO_DOM](range) {
    range.deleteContents();
    range.insertNode(this.root); 
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
  }

  [RENDER_TO_DOM](range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

export class Component {
  constructor() {
    this._root = null;
    this.props = Object.create(null);
    this.children = [];
    this._range = null;
    this.state = Object.create(null);
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(component) {
    this.children.push(component);
  }

  setState(newState) {
    // state 格式化
    if (this.state === null && typeof this.state !== 'object') {
      this.state = {};
      this.reRender();
      return;
    }
    // 合并 state
    const merge = (oldState, newState, deep = true) => {
      for (let p in newState) {
        if (deep && oldState[p] !== null && typeof oldState[p] === 'object') {
          merge(oldState[p], newState[p]);
        }
        oldState[p] = newState[p];
      }
    };
    merge(this.state, newState);
    this.reRender();
  }

  [RENDER_TO_DOM](range) {
    this._range = range;

    /**
     * this render 的返回值
     * 1. Component 触发递归调用 -> component[RENDER_TO_DOM](range)
     * 2. ElementWrapper
     * 3. TextWrapper
     */
    this.render()[RENDER_TO_DOM](range);
  }

  reRender() {
    // 存储旧range
    const oldRange = this._range;

    // 新的range（空的），用于 RENDER_TO_DOM
    const newRange = document.createRange()
    newRange.setStart(oldRange.startContainer, oldRange.startOffset);
    newRange.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](newRange);
    // newRange插入到dom后，旧range的start发生了改变，先更新一下
    oldRange.setStart(newRange.endContainer, newRange.endOffset);
    // 清除旧range
    oldRange.deleteContents();
    
  }

  render() {
    return null;
  }
}

export const createElement = (type, attrs, ...children) => {
  let ele;
  if (typeof type === 'string') {
    ele = new ElementWrapper(type);
  } else {
    ele = new type();
  }

  for (let p in attrs) {
    ele.setAttribute(p, attrs[p]);
  }

  const insertChildren = (children) => {
    for (let child of children) {
      if (child == null) {
        return;
      }
      if (typeof child === 'string') {
        child = new TextWrapper(child);
      }
      // {this.children}
      if (Array.isArray(child)) {
        insertChildren(child);
      } else {
        ele.appendChild(child);
      }
    }
  };
  insertChildren(children);

  return ele;
};

export const render = (component, parentNode) => {
  const range = document.createRange();
  range.setStart(parentNode, 0);
  range.setEnd(parentNode, parentNode.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
};
