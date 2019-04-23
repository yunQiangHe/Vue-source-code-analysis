function Compile(el, vm) {
    // 保存vm到complie对象
    this.$vm = vm;
    // 将el对应的元素对象保存到complie对象
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);
    // 若果有el元素
    if (this.$el) {
        // 1. 取出el元素中所有的子节点保存到一个fragment对象中
        this.$fragment = this.node2Fragment(this.$el);
        // 2. 编译fragment中所有层次的子节点
        this.init();
        // 3. 将编译好的fragment添加到页面的el元素中
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        // 创建空的fragment
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        // 编译指定的元素（所有层次的子节点）
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        // 取出最外层的子节点
        var childNodes = el.childNodes,
            me = this; //保存complie对象

        // 遍历所有的子节点text、element
        [].slice.call(childNodes).forEach(function(node) {
            // 得到节点的文本对象
            var text = node.textContent;
            // 创建正则表达式匹配大括号
            var reg = /\{\{(.*)\}\}/; //小括号--子匹配 

            // 判断节点是否是一个元素节点
            if (me.isElementNode(node)) {
                // 编译她（解析指令）
                me.compile(node);

            // 判断节点是否是大括号格式的文本节点
            } else if (me.isTextNode(node) && reg.test(text)) {
                //编译（大括号）表达式文本节点
                me.compileText(node, RegExp.$1.trim());
            }
            //如果当前子节点还有子节点 通过递归调用实现所有的层次子节点的编译
            if (node.childNodes && node.childNodes.length) {
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;

        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            if (me.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                // 事件指令
                if (me.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                    // 普通指令
                } else {
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    // 解析v-text / {{}}
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    // 解析v-html
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    // 解析v-model
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },
    // 解析v-class
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    bind: function(node, vm, exp, dir) {
        // 得到更新节点的函数
        var updaterFn = updater[dir + 'Updater'];
        // 调用函数更新节点
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    // 从VM得到表达式所对应的值
    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

// 包含多个更新节点的方法的工具对象
var updater = {
    // 更新节点的textcontent属性值
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    // 更新节点的innerHTML属性值
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },
    // 更新节点的className属性值
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },
    // 更新节点的value属性值
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};