class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(name, value) {
    this.root.setAttribute(name, value);
  }
  appendChild(component) {
    this.root.appendChild(component.root);
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
  }
}

export class Component {
  constructor() {
    this._root = null;
    this.props = Object.create(null);
    this.children = [];
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(component) {
    this.children.push(component);
  }

  get root() {
    if (!this._root) {
      this._root = this.render().root;
    }
    return this._root;
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
  parentNode.appendChild(component.root);
};
