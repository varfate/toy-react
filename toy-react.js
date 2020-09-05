/**
 * ElementWrapper 和 TextWrapper 是基本单位
 * Component 是 ElementWrapper 和 TextWrapper 的集合
 */

const RENDER_TO_DOM = Symbol('render to dom');

/**
 * 更新节点的内容,防止吞并
 * @param {Range} range 要更新的range
 * @param {HTMLElement} node 节点
 */
const replaceContent = (range, node) => {
  // 先插入 (在 Range 的起点处插入一个节点)
  range.insertNode(node);

  // 删除新节点之后的内容
  range.setStartAfter(node);
  range.deleteContents();

  // 修正range
  range.setStartBefore(node);
  range.setEndAfter(node);
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

  /**
   * 设置(更新)state
   * @param {object}} newState 新state
   */
  setState(newState) {
    // state 格式化
    if (this.state === null && typeof this.state !== 'object') {
      this.state = {};
      this.update();
      return;
    }
    // 合并 state
    const merge = (oldState, newState, deep = true) => {
      for (let p in newState) {
        if (deep && oldState[p] !== null && typeof oldState[p] === 'object') {
          // 递归
          merge(oldState[p], newState[p]);
        }
        oldState[p] = newState[p];
      }
    };
    merge(this.state, newState);
    // 更新
    this.update();
  }

  // 虚拟dom树
  get vdom() {
    // 递归
    return this.render().vdom;
  }

  [RENDER_TO_DOM](range) {
    // 下次更新的那一刻 _range, _vdom 都属于(充当)旧数据了
    this._range = range;
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }

  /**
   * 更新, diff
   */
  update() {
    /**
     * 对比新旧节点是否一致 (diff算法)
     * @param {ElementWrapper | TextWrapper} oldNode 
     * @param {ElementWrapper | TextWrapper} newNode 
     */
    const isSameNode = (oldNode, newNode) => {
      // 类型不同
      if (oldNode.type !== newNode.type) {
        return false;
      }
      // 属性字段不同
      if (
        Object.keys(oldNode.props).length > Object.keys(newNode.props).length
      ) {
        return false;
      }
      // 属性值不同
      for (let name in newNode.props) {
        if (oldNode.props[name] !== newNode.props[name]) {
          return false;
        }
      }
      // 如果是文本节点
      if (newNode.type === '#text') {
        // 内容不同
        if (oldNode.content !== newNode.content) {
          return false;
        }
      }
      return true;
    };
    /**
     * 更新节点
     * @param {ElementWrapper | TextWrapper}} oldNode 旧的节点
     * @param {ElementWrapper | TextWrapper} newNode 新的节点
     */
    const update = (oldNode, newNode) => {
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_TO_DOM](oldNode._range);
        return false;
      }
      newNode._range = oldNode._range;

      const newVchildren = newNode.vchildren;
      const oldVchildren = oldNode.vchildren;
      if (!newVchildren || !newVchildren.length) {
        return;
      }
      let tailRange = oldVchildren[oldVchildren.length - 1]._range;
      // 循环&递归对比children
      newVchildren.forEach((newVchild, i) => {
        const oldVchild = oldVchildren[i];
        if (i < oldVchildren.length) {
          // 递归调用
          update(oldVchild, newVchild);
        } else {
          const range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newVchild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      });
    };

    const vdom = this.vdom;
    update(this._vdom, vdom);
    this._vdom = vdom;
  }
}

/**
 * 非文本组件
 */
class ElementWrapper extends Component {
  constructor(type) {
    super();
    this.type = type;
  }

  get vdom() {
    this.vchildren = this.children.map((child) => child.vdom);
    // this 上包含 type,props,children
    return this;
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    const root = document.createElement(this.type);
    for (let name in this.props) {
      const value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        let eventName = RegExp.$1;
        eventName = eventName.replace(/^([\s\S])/, (c) => c.toLowerCase());
        root.addEventListener(eventName, value);
      } else if (name === 'className') {
        root.setAttribute('class', value);
      }
      root.setAttribute(name, value);
    }

    if (!this.vchildren) {
      this.vchildren = this.children.map((child) => child.vdom);
    }

    for (let child of this.vchildren) {
      const childRange = document.createRange();
      // 在 this._range 最后 append 新的 range (of component);
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      // 添加真实的dom
      child[RENDER_TO_DOM](childRange);
    }
    replaceContent(range, root);
  }
}

/**
 * 文本组件
 */
class TextWrapper extends Component {
  constructor(content) {
    super();
    this.type = '#text';
    this.content = content;
  }

  get vdom() {
    // this 上包含 type 和 content
    return this;
  }

  /**
   * 渲染到dom
   * @param {Range}} range new range
   */
  [RENDER_TO_DOM](range) {
    this._range = range;
    const root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
}

/**
 * 
 * @param {String | Component} type 标签类型
 * @param {Object} attrs 属性
 * @param  {...any} children 子组件
 */
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
        continue;
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

/**
 * 渲染开始~
 * @param {Component} component 组件
 * @param {HtmlElement} parentNode 根节点
 */
export const render = (component, parentNode) => {
  const range = document.createRange();
  range.setStart(parentNode, 0);
  range.setEnd(parentNode, parentNode.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
};
