/**
 * 相当于Vue构造函数
 * @param {*} options 
 */
function MVVM(options) {
    // 将配置对象保存到VM
    this.$options = options || {};
    // 将data对象保存到vm 和 变量data中
    var data = this._data = this.$options.data;
    // 保存VM到变量me
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function(key) {
        me._proxyData(key);
    });

    this._initComputed();

    observe(data, this);

    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },
    /**
     * 实现指定属性代理的方法
     * @param {*} key 
     * @param {*} setter 
     * @param {*} getter 
     */
    _proxyData: function(key, setter, getter) {
        // 保存VM
        var me = this;
        setter = setter || 
        Object.defineProperty(me, key, {
            configurable: false, //不能重新定义
            enumerable: true, //不可以枚举
            //当前通过vm.xxx 读取属性值时候调用 从data中获取对应的属性值返回  代理读操作
            get: function proxyGetter() {
                return me._data[key];
            },
            //当前通过vm.xxx = value 时候 value被保存到data对应的属性上  代理写操作
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};