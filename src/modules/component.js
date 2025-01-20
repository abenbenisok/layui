/**
 * component
 * Layui 2 组件构建器
 */

layui.define(['jquery', 'lay'], function(exports) {
  "use strict";

  var $ = layui.$;
  var lay = layui.lay;

  // export
  exports('component', function(settings) {
    // 默认设置
    settings = $.extend(true, {
      isRenderWithoutElem: false, // 渲染是否无需指定目标元素
      isRenderOnEvent: true, // 渲染是否仅由事件触发。--- 推荐根据组件类型始终显式设置对应值
      isDeepReload: false // 是否默认为深度重载
    }, settings);

    // 组件名
    var MOD_NAME = settings.name;
    var MOD_INDEX = 'layui_'+ MOD_NAME +'_index'; // 组件索引名
    var MOD_ID = 'lay-' + MOD_NAME + '-id'; // 用于记录组件实例 id 的属性名

    // 组件基础对外接口
    var component = {
      config: settings.global || {},
      index: layui[MOD_NAME] ? (layui[MOD_NAME].index + 10000) : 0,

      // 通用常量集，一般存放固定字符，如类名等
      CONST: $.extend(true, {
        MOD_NAME: MOD_NAME,
        MOD_INDEX: MOD_INDEX,

        CLASS_THIS: 'layui-this',
        CLASS_SHOW: 'layui-show',
        CLASS_HIDE: 'layui-hide',
        CLASS_HIDEV: 'layui-hide-v',
        CLASS_DISABLED: 'layui-disabled',
        CLASS_NONE: 'layui-none'
      }, settings.CONST),

      // 设置全局项
      set: function(options) {
        var that = this;
        $.extend(true, that.config, options);
        return that;
      },

      // 事件
      on: function(events, callback) {
        return layui.onevent.call(this, MOD_NAME, events, callback);
      }
    };

    // 扩展对外接口
    $.extend(true, component, settings.exports);

    // 操作当前实例
    var instance = function() {
      var that = this;
      var options = that.config;
      var id = options.id;

      // 实例对象
      var inst = {
        config: options,
        id: id,

        // 重置实例
        reload: function(options) {
          that.reload.call(that, options);
        }
      };

      // 扩展实例对象
      if (typeof settings.inst === 'function') {
        $.extend(true, inst, settings.inst.call(that));
      }

      // 返回实例对象
      return inst;
    };

    // 构造器
    var Class = function(options) {
      var that = this;
      that.index = ++component.index; // 每创建一个实例，下标自增

      // 扩展配置项：传入选项 -> 全局选项 -> 默认选项 = 当前选项
      that.config = $.extend(true, {}, that.config, component.config, options);

      // 初始化之前的回调
      if (typeof settings.beforeInit === 'function') {
        settings.beforeInit.call(that, that.config);
      }

      // 初始化
      that.init();
    };

    // 默认配置
    Class.prototype.config = settings.config;

    // 重载实例
    Class.prototype.reload = function(options, type) {
      var that = this;
      $.extend(settings.isDeepReload, that.config, options);
      that.init(true, type);
    };

    // 初始化准备（若由事件触发渲染，则必经此步）
    Class.prototype.init = function(rerender, type){
      var that = this;
      var options = that.config;
      var elem = $(options.elem);

      // 若 elem 非唯一，则拆分为多个实例
      if (elem.length > 1) {
        layui.each(elem, function() {
          component.render($.extend({}, options, {
            elem: this
          }));
        });
        return that;
      }

      // 合并 lay-options 属性上的配置信息
      $.extend(true, options, lay.options(elem[0]));

      // 若重复执行 render，则视为 reload 处理
      if (!rerender && elem.attr(MOD_ID)) {
        var newThat = instance.getThis(elem.attr(MOD_ID));
        if (!newThat) return;
        return newThat.reload(options, type);
      }

      options.elem = $(options.elem);

      // 初始化 id 属性 - 优先取 options.id > 元素 id > 自增索引
      options.id = lay.hasOwn(options, 'id') ? options.id : (
        elem.attr('id') || that.index
      );

      // 记录当前实例对象
      instance.that[options.id] = that;

      // 渲染之前的回调
      if (typeof settings.beforeRender === 'function') {
        settings.beforeRender.call(that, options);
      }

      // 执行渲染
      var render = function() {
        component.cache.id[options.id] = null; // 记录所有实例 id，用于批量操作（如 resize）
        elem.attr(MOD_ID, options.id); // 目标元素已渲染过的标记
        that.render(rerender); // 渲染核心
      };

      // 若绑定元素不存在
      if (!elem[0]) {
        return settings.isRenderWithoutElem ? render() : null; // 渲染是否无需指定目标元素
      };

      // 执行渲染 - 是否初始即渲染组件
      if((settings.isRenderOnEvent && options.show) || !settings.isRenderOnEvent) {
        render();
      }

      // 事件
      typeof settings.events === 'function' && that.events();
    };

    // 组件必传项
    Class.prototype.render = settings.render; // 渲染
    Class.prototype.events = settings.events; // 事件

    // 元素操作缓存
    Class.prototype.cache = function(key, value) {
      var that = this;
      var options = that.config;
      var elem = options.elem;

      if (!elem) return;

      var CACHE_NAME = 'lay_'+ MOD_NAME + '_cache';
      var cache = elem.data(CACHE_NAME) || {};

      if (value === undefined) return cache[key];

      cache[key] = value;
      elem.data(CACHE_NAME, cache);
    };

    // 缓存所有实例对象
    instance.that = {};

    // 获取当前实例对象
    instance.getThis = component.getThis = function(id) {
      if (id === undefined) {
        throw new Error('ID argument required');
      }
      return instance.that[id];
    };

    // 组件缓存
    component.cache = {
      id: {}
    };

    // 用于扩展原型
    component.Class = Class;

    // 完整重载实例
    component.reload = function(id, options) {
      var that = instance.getThis(id);
      if (!that) return;

      that.reload(options);
      return instance.call(that);
    };

    // 仅刷新视图 --- 待统一整理
    /* component.refresh = function(id) {
      var that = instance.getThis(id);
      if (!that) return;
    } */

    // 仅更新数据 --- 待统一整理
    /* component.update = function(id) {
      var that = instance.getThis(id);
      if (!that) return;
    } */

    // 核心入口
    component.render = function(options) {
      var inst = new Class(options);
      return instance.call(inst);
    };

    return component;
  });
});
